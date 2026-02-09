/**
 * Offers API — the core product endpoints.
 *
 * POST   /               Create offer (upload photos, start pipeline)
 * GET    /:id            Get offer with progress stage
 * POST   /:id/accept     Accept offer (triggers shipping flow)
 * POST   /:id/decline    Decline offer
 * GET    /               List user's offers (requires auth)
 */
import { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { cache } from '../../db/redis.js';
import { offerOrchestrator } from '../../services/offer-orchestrator.js';
import { requireAuth, optionalAuth } from '../middleware/auth.js';
import { logger } from '../../utils/logger.js';

export async function offerRoutes(fastify: FastifyInstance) {

  /**
   * POST /api/v1/offers
   * Create a new offer. Accepts photo URLs and optional description.
   * Works for both authenticated and anonymous users.
   */
  fastify.post('/', { preHandler: optionalAuth }, async (request, reply) => {
    const userId = (request as any).userId || null;
    const { photoUrls, userDescription } = request.body as {
      photoUrls: string[];
      userDescription?: string;
    };

    if (!photoUrls || photoUrls.length === 0) {
      return reply.status(400).send({ error: 'At least one photo URL required' });
    }

    if (photoUrls.length > 6) {
      return reply.status(400).send({ error: 'Maximum 6 photos allowed' });
    }

    // Rate limit: max offers per hour
    if (userId) {
      const rateKey = cache.keys.rateLimitUser(userId, 'offers-hour');
      const count = await cache.incrementWithExpiry(rateKey, 3600);
      if (count > 5) {
        return reply.status(429).send({ error: 'Too many offers. Try again in an hour, partner.' });
      }
    }

    try {
      const { offerId } = await offerOrchestrator.createOffer(userId, photoUrls, userDescription);

      logger.info({ offerId, userId }, 'Offer creation initiated');

      return reply.status(201).send({
        offerId,
        status: 'processing',
        message: "Hold tight, partner — Jake's takin' a look!",
      });
    } catch (err: any) {
      logger.error({ error: err.message }, 'Offer creation failed');
      return reply.status(500).send({ error: 'Failed to create offer' });
    }
  });

  /**
   * GET /api/v1/offers/:id
   * Retrieve an offer by ID. Includes processing stage for real-time tracking.
   * Public endpoint — the offer ID acts as a capability token.
   */
  fastify.get('/:id', async (request, reply) => {
    const { id } = request.params as { id: string };

    // Try cache first
    const cached = await cache.get<any>(cache.keys.offer(id));
    if (cached) {
      const stage = await offerOrchestrator.getStage(id);
      return { ...cached, processingStage: stage?.stage || null };
    }

    const offer = await db.findOne('offers', { id });

    if (!offer) {
      return reply.status(404).send({ error: 'Offer not found' });
    }

    // Parse JSONB fields
    const response = {
      id: offer.id,
      status: offer.status,
      // Item details (populated after vision)
      item: offer.item_brand ? {
        category: offer.item_category,
        subcategory: offer.item_subcategory,
        brand: offer.item_brand,
        model: offer.item_model,
        condition: offer.item_condition,
        features: offer.item_features,
        damage: offer.item_damage,
      } : null,
      // Photos
      photos: offer.photos,
      userDescription: offer.user_description,
      // AI confidence
      aiConfidence: offer.ai_confidence,
      // Pricing (populated after pricing stage)
      pricing: offer.fmv ? {
        fmv: parseFloat(offer.fmv),
        fmvConfidence: offer.fmv_confidence,
        offerAmount: parseFloat(offer.offer_amount),
        offerToMarketRatio: offer.offer_to_market_ratio,
      } : null,
      // Jake personality (populated after jake-voice stage)
      jake: offer.jake_script ? {
        script: offer.jake_script,
        voiceUrl: offer.jake_voice_url,
        animationState: offer.jake_animation_state,
        tier: offer.jake_tier,
      } : null,
      // Market context for the offer card
      marketData: offer.market_data,
      // Escalation info
      escalated: offer.escalated,
      escalationReason: offer.escalation_reason,
      // Timestamps
      expiresAt: offer.expires_at,
      createdAt: offer.created_at,
      acceptedAt: offer.accepted_at,
    };

    // Cache for 2 minutes (short TTL since status changes)
    if (offer.status !== 'processing') {
      await cache.set(cache.keys.offer(id), response, cache.ttl.offer);
    }

    // Attach processing stage if still in pipeline
    const stage = await offerOrchestrator.getStage(id);

    return { ...response, processingStage: stage?.stage || null };
  });

  /**
   * POST /api/v1/offers/:id/accept
   * Accept an offer. Requires auth (user must register/login first).
   */
  fastify.post('/:id/accept', { preHandler: requireAuth }, async (request, reply) => {
    const { id } = request.params as { id: string };
    const userId = (request as any).userId;

    const offer = await db.findOne('offers', { id });

    if (!offer) {
      return reply.status(404).send({ error: 'Offer not found' });
    }

    if (offer.status !== 'ready') {
      return reply.status(400).send({ error: `Cannot accept offer in '${offer.status}' status` });
    }

    // Check expiry
    if (offer.expires_at && new Date(offer.expires_at) < new Date()) {
      await db.update('offers', { id }, { status: 'expired' });
      return reply.status(410).send({ error: 'This offer has expired, partner.' });
    }

    // Update offer — link to user, mark as accepted
    await db.update('offers', { id }, {
      status: 'accepted',
      user_id: userId,
      accepted_at: new Date().toISOString(),
    });

    // Invalidate cache
    await cache.del(cache.keys.offer(id));

    // Log to audit trail
    await db.create('audit_log', {
      entity_type: 'offer',
      entity_id: id,
      action: 'state_change',
      actor_type: 'user',
      actor_id: userId,
      before: JSON.stringify({ status: 'ready' }),
      after: JSON.stringify({ status: 'accepted' }),
    });

    logger.info({ offerId: id, userId }, 'Offer accepted');

    return {
      status: 'accepted',
      message: "Deal! Now let's get this shipped to the warehouse.",
      nextStep: 'shipping',
      offerAmount: parseFloat(offer.offer_amount),
    };
  });

  /**
   * POST /api/v1/offers/:id/decline
   * Decline an offer. Optional auth.
   */
  fastify.post('/:id/decline', async (request, reply) => {
    const { id } = request.params as { id: string };
    const { reason } = (request.body as { reason?: string }) || {};

    const offer = await db.findOne('offers', { id });

    if (!offer) {
      return reply.status(404).send({ error: 'Offer not found' });
    }

    if (offer.status !== 'ready') {
      return reply.status(400).send({ error: `Cannot decline offer in '${offer.status}' status` });
    }

    await db.update('offers', { id }, { status: 'declined' });
    await cache.del(cache.keys.offer(id));

    await db.create('audit_log', {
      entity_type: 'offer',
      entity_id: id,
      action: 'state_change',
      actor_type: offer.user_id ? 'user' : 'system',
      actor_id: offer.user_id,
      before: JSON.stringify({ status: 'ready' }),
      after: JSON.stringify({ status: 'declined', reason }),
    });

    logger.info({ offerId: id, reason }, 'Offer declined');

    return {
      status: 'declined',
      message: "No hard feelin's, partner. Come back anytime!",
    };
  });

  /**
   * GET /api/v1/offers
   * List current user's offers (requires auth).
   */
  fastify.get('/', { preHandler: requireAuth }, async (request, _reply) => {
    const userId = (request as any).userId;
    const { status, limit, offset } = request.query as {
      status?: string;
      limit?: string;
      offset?: string;
    };

    const pageLimit = Math.min(parseInt(limit || '20', 10), 50);
    const pageOffset = parseInt(offset || '0', 10);

    let query = `SELECT * FROM offers WHERE user_id = $1`;
    const params: any[] = [userId];

    if (status) {
      query += ` AND status = $2`;
      params.push(status);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(pageLimit, pageOffset);

    const result = await db.query(query, params);

    return {
      offers: result.rows.map((o: any) => ({
        id: o.id,
        status: o.status,
        itemBrand: o.item_brand,
        itemModel: o.item_model,
        itemCondition: o.item_condition,
        offerAmount: o.offer_amount ? parseFloat(o.offer_amount) : null,
        photos: o.photos,
        expiresAt: o.expires_at,
        createdAt: o.created_at,
        acceptedAt: o.accepted_at,
      })),
      total: result.rowCount,
    };
  });
}
