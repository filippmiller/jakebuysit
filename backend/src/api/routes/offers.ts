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
import { createOfferSchema, declineOfferSchema, listOffersQuerySchema, uuidParamSchema, validateBody, validateParams, validateQuery } from '../schemas.js';
import { recommendations } from '../../integrations/recommendations-client.js';

export async function offerRoutes(fastify: FastifyInstance) {

  /**
   * POST /api/v1/offers
   * Create a new offer. Accepts photo URLs and optional description.
   * Works for both authenticated and anonymous users.
   */
  fastify.post('/', { preHandler: optionalAuth }, async (request, reply) => {
    const userId = (request as any).userId || null;
    const { photoUrls, userDescription } = validateBody(createOfferSchema, request.body);

    // Rate limit: max offers per hour (by user or by IP for anonymous)
    const rateKey = userId
      ? cache.keys.rateLimitUser(userId, 'offers-hour')
      : cache.keys.rateLimitIP(request.ip, 'offers-hour');
    const count = await cache.incrementWithExpiry(rateKey, 3600);
    if (count > 5) {
      return reply.status(429).send({ error: 'Too many offers. Try again in an hour, partner.' });
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
   * Uses optional auth to check ownership if user is logged in.
   */
  fastify.get('/:id', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);
    const userId = (request as any).userId || null;

    // Try cache first
    const cached = await cache.get<any>(cache.keys.offer(id));
    if (cached) {
      // Ownership check: if user is logged in and offer has a user_id, verify match
      if (userId && cached.user_id && cached.user_id !== userId) {
        return reply.status(403).send({ error: 'You can only view your own offers, partner.' });
      }
      const stage = await offerOrchestrator.getStage(id);
      return { ...cached, processingStage: stage?.stage || null };
    }

    const offer = await db.findOne('offers', { id });

    if (!offer) {
      return reply.status(404).send({ error: 'Offer not found' });
    }

    // Ownership check: if user is logged in and offer has a user_id, verify match
    if (userId && offer.user_id && offer.user_id !== userId) {
      return reply.status(403).send({ error: 'You can only view your own offers, partner.' });
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
      // Condition assessment (Phase 1 enhancement)
      conditionAssessment: offer.condition_grade ? {
        grade: offer.condition_grade,
        notes: offer.condition_notes,
      } : null,
      // Pricing (populated after pricing stage)
      pricing: offer.fmv ? {
        fmv: parseFloat(offer.fmv),
        fmvConfidence: offer.fmv_confidence,
        offerAmount: parseFloat(offer.offer_amount),
        offerToMarketRatio: offer.offer_to_market_ratio,
        // Phase 1 enhancement: confidence score
        pricingConfidence: offer.pricing_confidence,
      } : null,
      // Comparable sales data (Phase 1 enhancement)
      comparableSales: offer.comparable_sales || [],
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
    const { id } = validateParams(uuidParamSchema, request.params);
    const userId = (request as any).userId;

    const offer = await db.findOne('offers', { id });

    if (!offer) {
      return reply.status(404).send({ error: 'Offer not found' });
    }

    if (offer.status !== 'ready') {
      return reply.status(400).send({ error: `Cannot accept offer in '${offer.status}' status` });
    }

    // Ownership check: if the offer was created by a specific user, only that user can accept it
    if (offer.user_id && offer.user_id !== userId) {
      return reply.status(403).send({ error: 'You can only accept your own offers, partner.' });
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
    const { id } = validateParams(uuidParamSchema, request.params);
    const { reason } = validateBody(declineOfferSchema, request.body || {});

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
    const { status, limit: pageLimit, offset: pageOffset } = validateQuery(listOffersQuerySchema, request.query);

    // Count total matching rows first (for correct pagination metadata)
    let countQuery = `SELECT COUNT(*) FROM offers WHERE user_id = $1`;
    const countParams: any[] = [userId];

    if (status) {
      countQuery += ` AND status = $2`;
      countParams.push(status);
    }

    const countResult = await db.query(countQuery, countParams);
    const total = parseInt(countResult.rows[0].count, 10);

    // Fetch the page
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
        conditionGrade: o.condition_grade,
        offerAmount: o.offer_amount ? parseFloat(o.offer_amount) : null,
        pricingConfidence: o.pricing_confidence,
        photos: o.photos,
        expiresAt: o.expires_at,
        createdAt: o.created_at,
        acceptedAt: o.accepted_at,
      })),
      total,
    };
  });

  /**
   * GET /api/v1/offers/recent
   * Public endpoint — shows recent completed offers for the landing page ticker.
   * Cached for 5 minutes to reduce DB load.
   */
  fastify.get('/recent', async (_request, _reply) => {
    const cacheKey = 'offers:recent:ticker';
    const cached = await cache.get<any>(cacheKey);
    if (cached) return cached;

    const result = await db.query(
      `SELECT item_brand, item_model, offer_amount
       FROM offers
       WHERE status IN ('ready', 'accepted', 'paid') AND item_brand IS NOT NULL
       ORDER BY created_at DESC
       LIMIT 10`,
    );

    const response = {
      offers: result.rows.map((o: any) => ({
        itemBrand: o.item_brand,
        itemModel: o.item_model,
        offerAmount: parseFloat(o.offer_amount),
      })),
    };

    await cache.set(cacheKey, response, 300); // 5 min cache
    return response;
  });

  /**
   * POST /api/v1/offers/:id/view
   * Track user view activity for recommendation engine
   */
  fastify.post('/:id/view', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);
    const userId = (request as any).userId || null;
    const body = request.body as any || {};

    // Verify offer exists
    const offer = await db.findOne('offers', { id });
    if (!offer) {
      return reply.status(404).send({ error: 'Offer not found' });
    }

    try {
      // Track view activity
      await db.create('user_activity', {
        user_id: userId,
        offer_id: id,
        activity_type: 'view',
        source: body.source || 'direct',
        device_type: body.deviceType || null,
        time_spent_seconds: body.timeSpent || null,
        scroll_depth: body.scrollDepth || null,
        session_id: body.sessionId || null,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
      });

      logger.info({ offerId: id, userId }, 'Offer view tracked');

      return { success: true };
    } catch (err: any) {
      logger.error({ error: err.message, offerId: id }, 'Failed to track view');
      // Don't fail the request if tracking fails
      return { success: false };
    }
  });

  /**
   * GET /api/v1/offers/:id/recommendations
   * Get similar items to the current offer
   */
  fastify.get('/:id/recommendations', { preHandler: optionalAuth }, async (request, reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);
    const userId = (request as any).userId || null;

    try {
      const result = await recommendations.similar(id, 5, userId || undefined);
      return {
        recommendations: result.recommendations,
        algorithm: result.algorithm,
      };
    } catch (err: any) {
      logger.error({ error: err.message, offerId: id }, 'Failed to get recommendations');
      // Return empty array if recommendations service fails
      return { recommendations: [], algorithm: 'none' };
    }
  });

  /**
   * GET /api/v1/offers/trending
   * Get trending offers
   */
  fastify.get('/trending', async (request, _reply) => {
    const query = request.query as any || {};
    const days = parseInt(query.days || '7', 10);
    const limit = parseInt(query.limit || '10', 10);
    const category = query.category || undefined;

    try {
      const result = await recommendations.trending(days, limit, category);
      return {
        recommendations: result.recommendations,
        algorithm: result.algorithm,
      };
    } catch (err: any) {
      logger.error({ error: err.message }, 'Failed to get trending items');
      // Fallback to recent offers
      const fallback = await db.query(
        `SELECT id, item_brand, item_model, item_condition, offer_amount,
                photos->0->>'thumbnail_url' AS thumbnail_url
         FROM offers
         WHERE status = 'ready' AND item_brand IS NOT NULL
         ORDER BY created_at DESC
         LIMIT $1`,
        [limit]
      );

      return {
        recommendations: fallback.rows.map((o: any) => ({
          offer_id: o.id,
          score: 0.5,
          reason: 'Recently added',
          item_brand: o.item_brand,
          item_model: o.item_model,
          item_condition: o.item_condition,
          offer_amount: o.offer_amount ? parseFloat(o.offer_amount) : null,
          thumbnail_url: o.thumbnail_url,
        })),
        algorithm: 'fallback',
      };
    }
  });

  /**
   * GET /api/v1/offers/public
   * Public endpoint for sitemap generation - returns all "ready" offers.
   * Lightweight response with only essential fields for sitemap.
   */
  fastify.get('/public', async (_request, _reply) => {
    const cached = await cache.get<any>('offers:public:sitemap');
    if (cached) return cached;

    const result = await db.query(
      `SELECT id, created_at, updated_at
       FROM offers
       WHERE status = 'ready'
       ORDER BY created_at DESC
       LIMIT 10000`, // Sitemap limit
    );

    const response = result.rows;
    await cache.set('offers:public:sitemap', response, 3600); // Cache for 1 hour
    return response;
  });

  /**
   * GET /api/v1/offers/search
   * Search offers using full-text search and fuzzy matching.
   * Returns matching offers with relevance scoring.
   */
  fastify.get('/search', async (request, reply) => {
    const { q, limit: pageLimit = 20, offset: pageOffset = 0 } = request.query as any;

    if (!q || typeof q !== 'string' || q.trim().length < 2) {
      return reply.status(400).send({ error: 'Search query must be at least 2 characters' });
    }

    const searchTerm = q.trim();

    try {
      // Full-text search with trigram similarity scoring
      const result = await db.query(
        `SELECT
          id,
          item_brand,
          item_model,
          item_category,
          item_subcategory,
          item_condition,
          offer_amount,
          seo_title,
          photos->0->>'thumbnail_url' AS thumbnail_url,
          created_at,
          -- Relevance scoring
          ts_rank(
            to_tsvector('english',
              COALESCE(item_brand, '') || ' ' ||
              COALESCE(item_model, '') || ' ' ||
              COALESCE(item_category, '') || ' ' ||
              COALESCE(item_subcategory, '') || ' ' ||
              COALESCE(user_description, '')
            ),
            plainto_tsquery('english', $1)
          ) +
          GREATEST(
            similarity(COALESCE(item_brand, ''), $1),
            similarity(COALESCE(item_model, ''), $1)
          ) AS relevance
        FROM offers
        WHERE status = 'ready'
          AND (
            to_tsvector('english',
              COALESCE(item_brand, '') || ' ' ||
              COALESCE(item_model, '') || ' ' ||
              COALESCE(item_category, '') || ' ' ||
              COALESCE(item_subcategory, '') || ' ' ||
              COALESCE(user_description, '')
            ) @@ plainto_tsquery('english', $1)
            OR item_brand ILIKE $2
            OR item_model ILIKE $2
            OR item_category ILIKE $2
          )
        ORDER BY relevance DESC, created_at DESC
        LIMIT $3 OFFSET $4`,
        [searchTerm, `%${searchTerm}%`, pageLimit, pageOffset]
      );

      return {
        results: result.rows.map((o: any) => ({
          id: o.id,
          itemBrand: o.item_brand,
          itemModel: o.item_model,
          itemCategory: o.item_category,
          itemSubcategory: o.item_subcategory,
          itemCondition: o.item_condition,
          offerAmount: o.offer_amount ? parseFloat(o.offer_amount) : null,
          seoTitle: o.seo_title,
          thumbnailUrl: o.thumbnail_url,
          relevance: parseFloat(o.relevance),
          createdAt: o.created_at,
        })),
        total: result.rows.length,
        query: searchTerm,
      };
    } catch (err: any) {
      logger.error({ error: err.message, query: searchTerm }, 'Search failed');
      return reply.status(500).send({ error: 'Search failed' });
    }
  });

  /**
   * GET /api/v1/offers/insights
   * Get personalized market insights for sellers (public, no auth required).
   * Returns category-specific trends and optimal selling times.
   */
  fastify.get('/insights', async (request, _reply) => {
    const { category = 'Electronics' } = request.query as any;

    const cached = await cache.get<any>(`insights:${category}`);
    if (cached) return cached;

    try {
      // Get category insights
      const [categoryData, bestTime] = await Promise.all([
        db.query(`
          SELECT
            item_category,
            COUNT(*) as total_offers,
            ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::numeric / NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'declined')), 0) * 100, 1) as acceptance_rate,
            AVG(offer_amount)::numeric(10,2) as avg_offer,
            EXTRACT(DOW FROM created_at)::int as best_day,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '7 days') as recent_count,
            COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE - INTERVAL '14 days' AND created_at < CURRENT_DATE - INTERVAL '7 days') as prev_count
          FROM offers
          WHERE item_category = $1
            AND created_at >= CURRENT_DATE - INTERVAL '90 days'
            AND offer_amount IS NOT NULL
          GROUP BY item_category, best_day
          ORDER BY COUNT(*) DESC
          LIMIT 1
        `, [category]),
        db.query(`
          SELECT
            EXTRACT(DOW FROM created_at)::int as day_of_week,
            ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::numeric / NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'declined')), 0) * 100, 1) as acceptance_rate
          FROM offers
          WHERE item_category = $1
            AND created_at >= CURRENT_DATE - INTERVAL '90 days'
          GROUP BY day_of_week
          ORDER BY acceptance_rate DESC NULLS LAST
          LIMIT 1
        `, [category]),
      ]);

      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const cat = categoryData.rows[0] || { acceptance_rate: 0, avg_offer: 0, recent_count: 0, prev_count: 1, best_day: 2 };
      const bestDayData = bestTime.rows[0] || { day_of_week: 2, acceptance_rate: 0 };

      // Calculate trend
      const recentCount = parseInt(cat.recent_count || 0);
      const prevCount = parseInt(cat.prev_count || 1);
      const trendPercentage = ((recentCount - prevCount) / prevCount) * 100;
      const categoryTrend = trendPercentage > 5 ? 'up' : trendPercentage < -5 ? 'down' : 'stable';

      const insights = {
        category,
        bestDay: dayNames[bestDayData.day_of_week],
        acceptanceRate: parseFloat(cat.acceptance_rate || '0'),
        avgOffer: parseFloat(cat.avg_offer || '0'),
        categoryTrend,
        trendPercentage: Math.abs(trendPercentage),
        optimalTime: '2-4 PM', // Could be enhanced with hour-based analysis
      };

      await cache.set(`insights:${category}`, insights, 3600); // Cache for 1 hour
      return insights;
    } catch (err: any) {
      logger.error({ error: err.message, category }, 'Failed to get seller insights');
      // Return safe defaults
      return {
        category,
        bestDay: 'Tuesday',
        acceptanceRate: 65,
        avgOffer: 150,
        categoryTrend: 'stable',
        trendPercentage: 0,
        optimalTime: '2-4 PM',
      };
    }
  });
}
