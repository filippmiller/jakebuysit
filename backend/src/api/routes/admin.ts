/**
 * Admin API routes — comprehensive admin panel backend.
 *
 * All routes require admin role via requireAdmin middleware.
 * Super-admin only routes use requireRole('super_admin').
 *
 * Sections:
 *   /dashboard       — metrics, activity feed, quick actions
 *   /offers          — list, detail, update, AI logs
 *   /payouts         — list, process, fail
 *   /shipments       — list, generate label, update status
 *   /users           — list, detail, ban, role management
 *   /escalations     — queue, claim, resolve
 *   /fraud           — alerts, checks, rules
 *   /config          — system settings, audit log
 *   /audit           — full audit log access
 *   /analytics       — AI accuracy, revenue, conversion
 */
import { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { cache } from '../../db/redis.js';
import { requireAdmin, requireRole } from '../middleware/admin-auth.js';
import { logger } from '../../utils/logger.js';
import {
  adminListQuerySchema,
  adminOffersQuerySchema, adminUpdateOfferSchema,
  adminPayoutsQuerySchema, adminProcessPayoutSchema,
  adminShipmentsQuerySchema, adminGenerateLabelSchema,
  adminUsersQuerySchema, adminUpdateUserSchema,
  adminEscalationsQuerySchema, adminResolveEscalationSchema,
  adminFraudQuerySchema, adminUpdateConfigSchema,
  adminAuditQuerySchema, uuidParamSchema,
  validateBody, validateParams, validateQuery,
} from '../schemas.js';
import crypto from 'node:crypto';

/** Helper: write to audit log */
async function auditLog(entityType: string, entityId: string, action: string, actorId: string, before: any, after: any) {
  await db.create('audit_log', {
    entity_type: entityType,
    entity_id: entityId,
    action,
    actor_type: 'admin',
    actor_id: actorId,
    before: before ? JSON.stringify(before) : null,
    after: after ? JSON.stringify(after) : null,
  });
}

export async function adminRoutes(fastify: FastifyInstance) {

  // ═══════════════════════════════════════════
  // DASHBOARD
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/admin/dashboard/metrics
   * Real-time dashboard metrics.
   */
  fastify.get('/dashboard/metrics', { preHandler: requireAdmin }, async (_request, _reply) => {
    const cached = await cache.get<any>('admin:dashboard:metrics');
    if (cached) return cached;

    const [offers, payouts, shipments, users, escalations] = await Promise.all([
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_total,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE status = 'ready') as ready,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
          COUNT(*) FILTER (WHERE status = 'declined') as declined,
          COUNT(*) FILTER (WHERE status = 'shipped') as shipped,
          COUNT(*) FILTER (WHERE status = 'paid') as paid,
          COUNT(*) FILTER (WHERE escalated = true AND status NOT IN ('paid', 'declined', 'rejected', 'cancelled')) as open_escalations,
          AVG(CASE WHEN status IN ('accepted', 'paid') THEN offer_amount END)::numeric(10,2) as avg_offer,
          SUM(CASE WHEN status = 'accepted' AND accepted_at >= CURRENT_DATE THEN offer_amount ELSE 0 END)::numeric(10,2) as today_accepted_value,
          ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::numeric / NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'declined')), 0) * 100, 1) as acceptance_rate
        FROM offers
      `),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'processing') as processing,
          COUNT(*) FILTER (WHERE status = 'failed') as failed,
          SUM(CASE WHEN status = 'completed' AND completed_at >= CURRENT_DATE THEN amount ELSE 0 END)::numeric(10,2) as today_paid
        FROM payouts
      `),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status = 'in_transit') as in_transit,
          COUNT(*) FILTER (WHERE status = 'exception') as exceptions,
          COUNT(*) FILTER (WHERE status = 'delivered' AND actual_delivery >= CURRENT_DATE) as delivered_today
        FROM shipments
      `),
      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE created_at >= CURRENT_DATE) as today_new,
          COUNT(*) FILTER (WHERE banned = true) as banned
        FROM users
      `),
      db.query(`
        SELECT COUNT(*) as count
        FROM offers
        WHERE escalated = true AND status NOT IN ('paid', 'declined', 'rejected', 'cancelled')
          AND reviewer_id IS NULL
      `),
    ]);

    const metrics = {
      offers: offers.rows[0],
      payouts: payouts.rows[0],
      shipments: shipments.rows[0],
      users: users.rows[0],
      pendingEscalations: parseInt(escalations.rows[0].count),
      timestamp: new Date().toISOString(),
    };

    await cache.set('admin:dashboard:metrics', metrics, 30); // 30s cache
    return metrics;
  });

  /**
   * GET /api/v1/admin/dashboard/activity
   * Recent activity feed.
   */
  fastify.get('/dashboard/activity', { preHandler: requireAdmin }, async (_request, _reply) => {
    const result = await db.query(`
      SELECT id, entity_type, entity_id, action, actor_type, actor_id, created_at
      FROM audit_log
      ORDER BY created_at DESC
      LIMIT 50
    `);
    return { activity: result.rows };
  });

  /**
   * GET /api/v1/admin/dashboard/alerts
   * Active alerts: fraud flags, failed payouts, shipping exceptions, escalations.
   */
  fastify.get('/dashboard/alerts', { preHandler: requireAdmin }, async (_request, _reply) => {
    const [fraud, failedPayouts, exceptions, escalations] = await Promise.all([
      db.query(`
        SELECT fc.id, fc.check_type, fc.result, fc.confidence, fc.created_at,
               o.item_brand, o.item_model, o.offer_amount
        FROM fraud_checks fc
        JOIN offers o ON fc.offer_id = o.id
        WHERE fc.result IN ('flag', 'fail')
          AND fc.action_taken NOT IN ('reject')
        ORDER BY fc.created_at DESC LIMIT 10
      `),
      db.query(`
        SELECT p.id, p.amount, p.method, p.failure_reason, p.created_at, u.email
        FROM payouts p JOIN users u ON p.user_id = u.id
        WHERE p.status = 'failed'
        ORDER BY p.created_at DESC LIMIT 10
      `),
      db.query(`
        SELECT s.id, s.tracking_number, s.carrier, s.status, s.updated_at, o.item_brand, o.item_model
        FROM shipments s JOIN offers o ON s.offer_id = o.id
        WHERE s.status = 'exception'
        ORDER BY s.updated_at DESC LIMIT 10
      `),
      db.query(`
        SELECT o.id, o.item_brand, o.item_model, o.offer_amount, o.escalation_reason, o.created_at
        FROM offers o
        WHERE o.escalated = true
          AND o.status NOT IN ('paid', 'declined', 'rejected', 'cancelled')
          AND o.reviewer_id IS NULL
        ORDER BY o.created_at ASC LIMIT 10
      `),
    ]);

    return {
      fraudAlerts: fraud.rows,
      failedPayouts: failedPayouts.rows,
      shippingExceptions: exceptions.rows,
      pendingEscalations: escalations.rows,
    };
  });

  // ═══════════════════════════════════════════
  // OFFERS MANAGEMENT
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/admin/offers
   * List all offers with advanced filters.
   */
  fastify.get('/offers', { preHandler: requireAdmin }, async (request, _reply) => {
    const q = validateQuery(adminOffersQuerySchema, request.query);
    const params: any[] = [];
    const conditions: string[] = [];
    let paramIdx = 1;

    if (q.status) { conditions.push(`o.status = $${paramIdx++}`); params.push(q.status); }
    if (q.escalated !== undefined) { conditions.push(`o.escalated = $${paramIdx++}`); params.push(q.escalated); }
    if (q.category) { conditions.push(`o.item_category ILIKE $${paramIdx++}`); params.push(`%${q.category}%`); }
    if (q.minAmount !== undefined) { conditions.push(`o.offer_amount >= $${paramIdx++}`); params.push(q.minAmount); }
    if (q.maxAmount !== undefined) { conditions.push(`o.offer_amount <= $${paramIdx++}`); params.push(q.maxAmount); }
    if (q.dateFrom) { conditions.push(`o.created_at >= $${paramIdx++}`); params.push(q.dateFrom); }
    if (q.dateTo) { conditions.push(`o.created_at <= $${paramIdx++}`); params.push(q.dateTo); }
    if (q.search) {
      conditions.push(`(o.item_brand ILIKE $${paramIdx} OR o.item_model ILIKE $${paramIdx} OR o.id::text ILIKE $${paramIdx})`);
      params.push(`%${q.search}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Validate sort column against allowlist
    const allowedSortColumns: Record<string, string> = {
      created_at: 'o.created_at', offer_amount: 'o.offer_amount', status: 'o.status',
      item_brand: 'o.item_brand', ai_confidence: 'o.ai_confidence',
    };
    const sortCol = allowedSortColumns[q.sort ?? 'created_at'] || 'o.created_at';
    const sortOrder = q.order === 'asc' ? 'ASC' : 'DESC';

    const [countResult, dataResult] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM offers o ${where}`, params),
      db.query(`
        SELECT o.*, u.email as user_email, u.name as user_name
        FROM offers o
        LEFT JOIN users u ON o.user_id = u.id
        ${where}
        ORDER BY ${sortCol} ${sortOrder}
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `, [...params, q.limit, q.offset]),
    ]);

    return {
      offers: dataResult.rows,
      total: parseInt(countResult.rows[0].count),
      limit: q.limit,
      offset: q.offset,
    };
  });

  /**
   * GET /api/v1/admin/offers/:id
   * Full offer detail with AI assessment log.
   */
  fastify.get('/offers/:id', { preHandler: requireAdmin }, async (request, _reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);

    const [offer, fraudChecks, auditEntries, shipment, payout, verification] = await Promise.all([
      db.query(`
        SELECT o.*, u.email as user_email, u.name as user_name, u.trust_score
        FROM offers o LEFT JOIN users u ON o.user_id = u.id
        WHERE o.id = $1
      `, [id]),
      db.query(`SELECT * FROM fraud_checks WHERE offer_id = $1 ORDER BY created_at`, [id]),
      db.query(`SELECT * FROM audit_log WHERE entity_type = 'offer' AND entity_id = $1 ORDER BY created_at`, [id]),
      db.query(`SELECT * FROM shipments WHERE offer_id = $1`, [id]),
      db.query(`SELECT * FROM payouts WHERE offer_id = $1`, [id]),
      db.query(`SELECT * FROM verifications WHERE offer_id = $1`, [id]),
    ]);

    if (offer.rows.length === 0) {
      return { error: 'Offer not found', statusCode: 404 };
    }

    return {
      offer: offer.rows[0],
      fraudChecks: fraudChecks.rows,
      auditTrail: auditEntries.rows,
      shipment: shipment.rows[0] || null,
      payout: payout.rows[0] || null,
      verification: verification.rows[0] || null,
    };
  });

  /**
   * PATCH /api/v1/admin/offers/:id
   * Update offer (price adjustment, status change, escalation notes).
   */
  fastify.patch('/offers/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);
    const updates = validateBody(adminUpdateOfferSchema, request.body);
    const adminId = (request as any).userId;

    const before = await db.findOne('offers', { id });
    if (!before) return reply.status(404).send({ error: 'Offer not found' });

    const data: Record<string, any> = {};
    const isPriceChange = updates.offer_amount !== undefined && updates.offer_amount !== before.offer_amount;

    if (updates.offer_amount !== undefined) data.offer_amount = updates.offer_amount;
    if (updates.status) data.status = updates.status;
    if (updates.escalation_notes) data.escalation_notes = JSON.stringify(updates.escalation_notes);
    if (updates.reviewer_id) { data.reviewer_id = updates.reviewer_id; data.reviewed_at = new Date().toISOString(); }

    if (Object.keys(data).length === 0) return reply.status(400).send({ error: 'No valid fields to update' });

    // Use transaction for price changes to ensure price_history consistency
    let after;
    if (isPriceChange) {
      after = await db.transaction(async (trx) => {
        // Update offer
        const updated = await trx.update('offers', { id }, data);
        if (!updated) throw new Error('Offer update failed');

        // Record price change in history
        await trx.create('price_history', {
          offer_id: id,
          old_price: before.offer_amount,
          new_price: updates.offer_amount,
          reason: 'admin_adjustment',
          trigger_type: 'manual',
          changed_by: adminId,
          notes: updates.escalation_notes ? `Admin notes: ${JSON.stringify(updates.escalation_notes)}` : 'Manual admin adjustment',
          days_since_created: Math.floor((Date.now() - new Date(before.created_at).getTime()) / (1000 * 60 * 60 * 24)),
        });

        return updated;
      });
    } else {
      after = await db.update('offers', { id }, data);
    }

    await cache.del(cache.keys.offer(id));
    await auditLog('offer', id, 'admin_update', adminId, before, after);

    logger.info({ offerId: id, adminId, updates: data, priceChange: isPriceChange }, 'Admin updated offer');
    return { offer: after };
  });

  /**
   * GET /api/v1/admin/offers/:id/ai-log
   * AI assessment breakdown: vision, marketplace, pricing stages.
   */
  fastify.get('/offers/:id/ai-log', { preHandler: requireAdmin }, async (request, _reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);

    const offer = await db.findOne('offers', { id });
    if (!offer) return { error: 'Offer not found', statusCode: 404 };

    return {
      offerId: id,
      vision: {
        identification: offer.ai_identification,
        confidence: offer.ai_confidence,
        modelUsed: offer.ai_model_used,
        itemCategory: offer.item_category,
        itemBrand: offer.item_brand,
        itemModel: offer.item_model,
        itemCondition: offer.item_condition,
        features: offer.item_features,
        damage: offer.item_damage,
      },
      marketplace: {
        data: offer.market_data,
        fmv: offer.fmv ? parseFloat(offer.fmv) : null,
        fmvConfidence: offer.fmv_confidence,
      },
      pricing: {
        conditionMultiplier: offer.condition_multiplier,
        categoryMargin: offer.category_margin,
        dynamicAdjustments: offer.dynamic_adjustments,
        finalOffer: offer.offer_amount ? parseFloat(offer.offer_amount) : null,
        offerToMarketRatio: offer.offer_to_market_ratio,
      },
      escalation: {
        escalated: offer.escalated,
        reason: offer.escalation_reason,
        notes: offer.escalation_notes,
        reviewerId: offer.reviewer_id,
        reviewedAt: offer.reviewed_at,
      },
    };
  });

  // ═══════════════════════════════════════════
  // PAYOUTS
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/admin/payouts
   */
  fastify.get('/payouts', { preHandler: requireAdmin }, async (request, _reply) => {
    const q = validateQuery(adminPayoutsQuerySchema, request.query);
    const params: any[] = [];
    const conditions: string[] = [];
    let paramIdx = 1;

    if (q.status) { conditions.push(`p.status = $${paramIdx++}`); params.push(q.status); }
    if (q.method) { conditions.push(`p.method = $${paramIdx++}`); params.push(q.method); }
    if (q.dateFrom) { conditions.push(`p.created_at >= $${paramIdx++}`); params.push(q.dateFrom); }
    if (q.dateTo) { conditions.push(`p.created_at <= $${paramIdx++}`); params.push(q.dateTo); }
    if (q.search) {
      conditions.push(`(u.email ILIKE $${paramIdx} OR p.transaction_ref ILIKE $${paramIdx})`);
      params.push(`%${q.search}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult, dataResult] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM payouts p LEFT JOIN users u ON p.user_id = u.id ${where}`, params),
      db.query(`
        SELECT p.*, u.email as user_email, u.name as user_name,
               o.item_brand, o.item_model
        FROM payouts p
        LEFT JOIN users u ON p.user_id = u.id
        LEFT JOIN offers o ON p.offer_id = o.id
        ${where}
        ORDER BY p.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `, [...params, q.limit, q.offset]),
    ]);

    return { payouts: dataResult.rows, total: parseInt(countResult.rows[0].count) };
  });

  /**
   * POST /api/v1/admin/payouts/:id/process
   * Approve or reject a payout.
   */
  fastify.post('/payouts/:id/process', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);
    const { action, transaction_ref, failure_reason } = validateBody(adminProcessPayoutSchema, request.body);
    const adminId = (request as any).userId;

    const payout = await db.findOne('payouts', { id });
    if (!payout) return reply.status(404).send({ error: 'Payout not found' });
    if (payout.status !== 'pending') return reply.status(400).send({ error: `Cannot process payout in '${payout.status}' status` });

    let data: Record<string, any>;
    if (action === 'approve') {
      data = { status: 'processing', transaction_ref: transaction_ref || null };
    } else {
      data = { status: 'failed', failure_reason: failure_reason || 'Rejected by admin' };
    }

    const updated = await db.update('payouts', { id }, data);
    await auditLog('payout', id, `admin_${action}`, adminId, payout, updated);

    logger.info({ payoutId: id, adminId, action }, 'Admin processed payout');
    return { payout: updated };
  });

  /**
   * POST /api/v1/admin/payouts/:id/complete
   * Mark a processing payout as completed.
   */
  fastify.post('/payouts/:id/complete', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);
    const adminId = (request as any).userId;

    const payout = await db.findOne('payouts', { id });
    if (!payout) return reply.status(404).send({ error: 'Payout not found' });
    if (payout.status !== 'processing') return reply.status(400).send({ error: 'Payout must be in processing status' });

    const updated = await db.update('payouts', { id }, { status: 'completed', completed_at: new Date().toISOString() });
    await auditLog('payout', id, 'admin_complete', adminId, payout, updated);

    // Also update the related offer status
    if (payout.offer_id) {
      await db.update('offers', { id: payout.offer_id }, { status: 'paid' });
      await cache.del(cache.keys.offer(payout.offer_id));
    }

    return { payout: updated };
  });

  // ═══════════════════════════════════════════
  // SHIPMENTS & LABELS
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/admin/shipments
   */
  fastify.get('/shipments', { preHandler: requireAdmin }, async (request, _reply) => {
    const q = validateQuery(adminShipmentsQuerySchema, request.query);
    const params: any[] = [];
    const conditions: string[] = [];
    let paramIdx = 1;

    if (q.status) { conditions.push(`s.status = $${paramIdx++}`); params.push(q.status); }
    if (q.carrier) { conditions.push(`s.carrier = $${paramIdx++}`); params.push(q.carrier); }
    if (q.search) {
      conditions.push(`(s.tracking_number ILIKE $${paramIdx} OR u.email ILIKE $${paramIdx})`);
      params.push(`%${q.search}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult, dataResult] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM shipments s LEFT JOIN users u ON s.user_id = u.id ${where}`, params),
      db.query(`
        SELECT s.*, u.email as user_email, o.item_brand, o.item_model, o.offer_amount
        FROM shipments s
        LEFT JOIN users u ON s.user_id = u.id
        LEFT JOIN offers o ON s.offer_id = o.id
        ${where}
        ORDER BY s.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `, [...params, q.limit, q.offset]),
    ]);

    return { shipments: dataResult.rows, total: parseInt(countResult.rows[0].count) };
  });

  /**
   * POST /api/v1/admin/shipments/generate-label
   * Generate a shipping label for an accepted offer.
   */
  fastify.post('/shipments/generate-label', { preHandler: requireAdmin }, async (request, reply) => {
    const body = validateBody(adminGenerateLabelSchema, request.body);
    const adminId = (request as any).userId;

    const offer = await db.findOne('offers', { id: body.offer_id });
    if (!offer) return reply.status(404).send({ error: 'Offer not found' });
    if (offer.status !== 'accepted') return reply.status(400).send({ error: 'Offer must be accepted before generating label' });

    // Generate a mock tracking number (in production, call carrier API)
    const trackingNumber = `JBI${Date.now()}${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    const labelUrl = `https://labels.jakebuysit.com/${trackingNumber}.pdf`;

    const shipment = await db.create('shipments', {
      offer_id: body.offer_id,
      user_id: offer.user_id,
      carrier: body.carrier,
      service: body.service,
      tracking_number: trackingNumber,
      label_url: labelUrl,
      label_cost: body.carrier === 'USPS' ? 7.75 : 12.50,
      address: JSON.stringify(body.address),
      status: 'label_created',
      status_history: JSON.stringify([{ status: 'label_created', timestamp: new Date().toISOString() }]),
    });

    await db.update('offers', { id: body.offer_id }, { status: 'shipped' });
    await cache.del(cache.keys.offer(body.offer_id));
    await auditLog('shipment', shipment.id, 'label_generated', adminId, null, shipment);

    logger.info({ shipmentId: shipment.id, offerId: body.offer_id, trackingNumber }, 'Label generated');
    return { shipment };
  });

  /**
   * PATCH /api/v1/admin/shipments/:id
   * Update shipment status.
   */
  fastify.patch('/shipments/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);
    const { status } = request.body as any;
    const adminId = (request as any).userId;

    if (!['label_created', 'in_transit', 'delivered', 'exception'].includes(status)) {
      return reply.status(400).send({ error: 'Invalid shipment status' });
    }

    const before = await db.findOne('shipments', { id });
    if (!before) return reply.status(404).send({ error: 'Shipment not found' });

    const history = before.status_history || [];
    history.push({ status, timestamp: new Date().toISOString() });

    const data: Record<string, any> = { status, status_history: JSON.stringify(history) };
    if (status === 'delivered') data.actual_delivery = new Date().toISOString();

    const after = await db.update('shipments', { id }, data);

    // Update offer status on delivery
    if (status === 'delivered' && before.offer_id) {
      await db.update('offers', { id: before.offer_id }, { status: 'received' });
      await cache.del(cache.keys.offer(before.offer_id));
    }

    await auditLog('shipment', id, 'status_update', adminId, before, after);
    return { shipment: after };
  });

  // ═══════════════════════════════════════════
  // USER MANAGEMENT
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/admin/users
   */
  fastify.get('/users', { preHandler: requireAdmin }, async (request, _reply) => {
    const q = validateQuery(adminUsersQuerySchema, request.query);
    const params: any[] = [];
    const conditions: string[] = [];
    let paramIdx = 1;

    if (q.role) { conditions.push(`u.role = $${paramIdx++}`); params.push(q.role); }
    if (q.banned !== undefined) { conditions.push(`u.banned = $${paramIdx++}`); params.push(q.banned); }
    if (q.verified !== undefined) { conditions.push(`u.verified = $${paramIdx++}`); params.push(q.verified); }
    if (q.search) {
      conditions.push(`(u.email ILIKE $${paramIdx} OR u.name ILIKE $${paramIdx})`);
      params.push(`%${q.search}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult, dataResult] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM users u ${where}`, params),
      db.query(`
        SELECT u.id, u.email, u.name, u.phone, u.role, u.verified, u.trust_score,
               u.banned, u.ban_reason, u.jake_familiarity, u.jake_bucks_balance,
               u.created_at, u.updated_at,
               (SELECT COUNT(*) FROM offers WHERE user_id = u.id) as offer_count,
               (SELECT COALESCE(SUM(amount), 0) FROM payouts WHERE user_id = u.id AND status = 'completed') as total_paid
        FROM users u
        ${where}
        ORDER BY u.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `, [...params, q.limit, q.offset]),
    ]);

    return { users: dataResult.rows, total: parseInt(countResult.rows[0].count) };
  });

  /**
   * GET /api/v1/admin/users/:id
   * Full user detail with offer history.
   */
  fastify.get('/users/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);

    const [userResult, offersResult, payoutsResult, fraudResult] = await Promise.all([
      db.query(`
        SELECT id, email, name, phone, role, auth_provider, verified, trust_score,
               risk_flags, banned, ban_reason, payout_preferred, jake_bucks_balance,
               jake_familiarity, preferences, created_at, updated_at
        FROM users WHERE id = $1
      `, [id]),
      db.query(`SELECT * FROM offers WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50`, [id]),
      db.query(`SELECT * FROM payouts WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [id]),
      db.query(`SELECT * FROM fraud_checks WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20`, [id]),
    ]);

    if (userResult.rows.length === 0) return reply.status(404).send({ error: 'User not found' });

    return {
      user: userResult.rows[0],
      offers: offersResult.rows,
      payouts: payoutsResult.rows,
      fraudChecks: fraudResult.rows,
    };
  });

  /**
   * PATCH /api/v1/admin/users/:id
   * Update user role, ban, trust score.
   */
  fastify.patch('/users/:id', { preHandler: requireRole('admin', 'super_admin') }, async (request, reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);
    const updates = validateBody(adminUpdateUserSchema, request.body);
    const adminId = (request as any).userId;
    const adminRole = (request as any).adminRole;

    const before = await db.findOne('users', { id });
    if (!before) return reply.status(404).send({ error: 'User not found' });

    // Only super_admin can grant admin/super_admin roles
    if (updates.role && ['admin', 'super_admin'].includes(updates.role) && adminRole !== 'super_admin') {
      return reply.status(403).send({ error: 'Only super_admin can grant admin roles' });
    }

    const data: Record<string, any> = {};
    if (updates.role !== undefined) data.role = updates.role;
    if (updates.banned !== undefined) data.banned = updates.banned;
    if (updates.ban_reason !== undefined) data.ban_reason = updates.ban_reason;
    if (updates.trust_score !== undefined) data.trust_score = updates.trust_score;
    if (updates.verified !== undefined) data.verified = updates.verified;

    if (Object.keys(data).length === 0) return reply.status(400).send({ error: 'No valid fields to update' });

    const after = await db.update('users', { id }, data);
    await cache.del(cache.keys.user(id));
    await auditLog('user', id, 'admin_update', adminId, before, after);

    logger.info({ targetUserId: id, adminId, updates: data }, 'Admin updated user');
    return { user: after };
  });

  // ═══════════════════════════════════════════
  // ESCALATION QUEUE
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/admin/escalations
   * List escalated offers for manual review.
   */
  fastify.get('/escalations', { preHandler: requireAdmin }, async (request, _reply) => {
    const q = validateQuery(adminEscalationsQuerySchema, request.query);
    const params: any[] = [];
    const conditions: string[] = ['o.escalated = true'];
    let paramIdx = 1;

    if (q.status === 'open') {
      conditions.push(`o.reviewer_id IS NULL`);
      conditions.push(`o.status NOT IN ('paid', 'declined', 'rejected', 'cancelled')`);
    } else if (q.status === 'claimed') {
      conditions.push(`o.reviewer_id IS NOT NULL`);
      conditions.push(`o.reviewed_at IS NULL`);
    } else if (q.status === 'resolved') {
      conditions.push(`o.reviewed_at IS NOT NULL`);
    }

    if (q.search) {
      conditions.push(`(o.item_brand ILIKE $${paramIdx} OR o.item_model ILIKE $${paramIdx})`);
      params.push(`%${q.search}%`);
      paramIdx++;
    }

    const where = `WHERE ${conditions.join(' AND ')}`;

    const [countResult, dataResult] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM offers o ${where}`, params),
      db.query(`
        SELECT o.*, u.email as user_email, r.email as reviewer_email
        FROM offers o
        LEFT JOIN users u ON o.user_id = u.id
        LEFT JOIN users r ON o.reviewer_id = r.id
        ${where}
        ORDER BY o.created_at ASC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `, [...params, q.limit, q.offset]),
    ]);

    return { escalations: dataResult.rows, total: parseInt(countResult.rows[0].count) };
  });

  /**
   * POST /api/v1/admin/escalations/:id/claim
   * Claim an escalation for review.
   */
  fastify.post('/escalations/:id/claim', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);
    const adminId = (request as any).userId;

    const offer = await db.findOne('offers', { id });
    if (!offer) return reply.status(404).send({ error: 'Offer not found' });
    if (!offer.escalated) return reply.status(400).send({ error: 'Offer is not escalated' });
    if (offer.reviewer_id) return reply.status(409).send({ error: 'Already claimed by another reviewer' });

    const updated = await db.update('offers', { id }, { reviewer_id: adminId });
    await auditLog('offer', id, 'escalation_claimed', adminId, offer, updated);

    return { offer: updated };
  });

  /**
   * POST /api/v1/admin/escalations/:id/resolve
   * Resolve an escalation with a decision.
   */
  fastify.post('/escalations/:id/resolve', { preHandler: requireAdmin }, async (request, reply) => {
    const { id } = validateParams(uuidParamSchema, request.params);
    const { decision, revised_amount, notes } = validateBody(adminResolveEscalationSchema, request.body);
    const adminId = (request as any).userId;

    const offer = await db.findOne('offers', { id });
    if (!offer) return reply.status(404).send({ error: 'Offer not found' });
    if (!offer.escalated) return reply.status(400).send({ error: 'Offer is not escalated' });

    const data: Record<string, any> = {
      reviewed_at: new Date().toISOString(),
      escalation_notes: JSON.stringify({ decision, notes, revised_amount, resolvedBy: adminId }),
    };

    if (decision === 'approve') {
      data.status = 'ready';
    } else if (decision === 'adjust' && revised_amount) {
      data.offer_amount = revised_amount;
      data.status = 'ready';
    } else if (decision === 'reject') {
      data.status = 'rejected';
    }

    const updated = await db.update('offers', { id }, data);
    await cache.del(cache.keys.offer(id));
    await auditLog('offer', id, 'escalation_resolved', adminId, offer, updated);

    logger.info({ offerId: id, adminId, decision }, 'Escalation resolved');
    return { offer: updated };
  });

  // ═══════════════════════════════════════════
  // FRAUD DETECTION
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/admin/fraud
   */
  fastify.get('/fraud', { preHandler: requireAdmin }, async (request, _reply) => {
    const q = validateQuery(adminFraudQuerySchema, request.query);
    const params: any[] = [];
    const conditions: string[] = [];
    let paramIdx = 1;

    if (q.result) { conditions.push(`fc.result = $${paramIdx++}`); params.push(q.result); }
    if (q.check_type) { conditions.push(`fc.check_type = $${paramIdx++}`); params.push(q.check_type); }
    if (q.search) {
      conditions.push(`(u.email ILIKE $${paramIdx} OR o.item_brand ILIKE $${paramIdx})`);
      params.push(`%${q.search}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult, dataResult] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM fraud_checks fc LEFT JOIN users u ON fc.user_id = u.id LEFT JOIN offers o ON fc.offer_id = o.id ${where}`, params),
      db.query(`
        SELECT fc.*, u.email as user_email, o.item_brand, o.item_model, o.offer_amount
        FROM fraud_checks fc
        LEFT JOIN users u ON fc.user_id = u.id
        LEFT JOIN offers o ON fc.offer_id = o.id
        ${where}
        ORDER BY fc.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `, [...params, q.limit, q.offset]),
    ]);

    return { fraudChecks: dataResult.rows, total: parseInt(countResult.rows[0].count) };
  });

  /**
   * GET /api/v1/admin/fraud/stats
   * Fraud statistics and patterns.
   */
  fastify.get('/fraud/stats', { preHandler: requireAdmin }, async (_request, _reply) => {
    const result = await db.query(`
      SELECT
        check_type,
        result,
        COUNT(*) as count,
        AVG(confidence)::numeric(5,3) as avg_confidence
      FROM fraud_checks
      GROUP BY check_type, result
      ORDER BY check_type, result
    `);

    return { stats: result.rows };
  });

  // ═══════════════════════════════════════════
  // CONFIGURATION
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/admin/config
   * Get all system configuration.
   */
  fastify.get('/config', { preHandler: requireAdmin }, async (_request, _reply) => {
    const result = await db.query(`SELECT * FROM config ORDER BY key`);
    return { config: result.rows };
  });

  /**
   * PUT /api/v1/admin/config
   * Update a configuration key. Super-admin only.
   */
  fastify.put('/config', { preHandler: requireRole('super_admin') }, async (request, _reply) => {
    const { key, value } = validateBody(adminUpdateConfigSchema, request.body);
    const adminId = (request as any).userId;

    const before = await db.findOne('config', { key });

    await db.query(
      `INSERT INTO config (key, value, updated_by, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $2, updated_by = $3, updated_at = NOW()`,
      [key, JSON.stringify(value), adminId],
    );

    await cache.del(cache.keys.config);
    await auditLog('config', key, 'config_update', adminId, before?.value, value);

    logger.info({ key, adminId }, 'Config updated');
    return { success: true, key };
  });

  // ═══════════════════════════════════════════
  // AUDIT LOG
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/admin/audit
   */
  fastify.get('/audit', { preHandler: requireAdmin }, async (request, _reply) => {
    const q = validateQuery(adminAuditQuerySchema, request.query);
    const params: any[] = [];
    const conditions: string[] = [];
    let paramIdx = 1;

    if (q.entity_type) { conditions.push(`a.entity_type = $${paramIdx++}`); params.push(q.entity_type); }
    if (q.action) { conditions.push(`a.action = $${paramIdx++}`); params.push(q.action); }
    if (q.actor_type) { conditions.push(`a.actor_type = $${paramIdx++}`); params.push(q.actor_type); }
    if (q.dateFrom) { conditions.push(`a.created_at >= $${paramIdx++}`); params.push(q.dateFrom); }
    if (q.dateTo) { conditions.push(`a.created_at <= $${paramIdx++}`); params.push(q.dateTo); }
    if (q.search) {
      conditions.push(`(a.entity_id::text ILIKE $${paramIdx} OR a.action ILIKE $${paramIdx})`);
      params.push(`%${q.search}%`);
      paramIdx++;
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const [countResult, dataResult] = await Promise.all([
      db.query(`SELECT COUNT(*) FROM audit_log a ${where}`, params),
      db.query(`
        SELECT a.*, u.email as actor_email
        FROM audit_log a
        LEFT JOIN users u ON a.actor_id = u.id
        ${where}
        ORDER BY a.created_at DESC
        LIMIT $${paramIdx++} OFFSET $${paramIdx++}
      `, [...params, q.limit, q.offset]),
    ]);

    return { entries: dataResult.rows, total: parseInt(countResult.rows[0].count) };
  });

  // ═══════════════════════════════════════════
  // ANALYTICS
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/admin/analytics/ai-accuracy
   * AI confidence distribution and escalation rates.
   */
  fastify.get('/analytics/ai-accuracy', { preHandler: requireAdmin }, async (_request, _reply) => {
    const [confidence, escalations, categories] = await Promise.all([
      db.query(`
        SELECT
          CASE
            WHEN ai_confidence >= 90 THEN '90-100'
            WHEN ai_confidence >= 80 THEN '80-89'
            WHEN ai_confidence >= 70 THEN '70-79'
            WHEN ai_confidence >= 60 THEN '60-69'
            ELSE 'below-60'
          END as range,
          COUNT(*) as count,
          AVG(ai_confidence)::numeric(5,2) as avg_confidence
        FROM offers WHERE ai_confidence IS NOT NULL
        GROUP BY range ORDER BY range DESC
      `),
      db.query(`
        SELECT
          COUNT(*) FILTER (WHERE escalated = true) as escalated,
          COUNT(*) as total,
          ROUND(COUNT(*) FILTER (WHERE escalated = true)::numeric / NULLIF(COUNT(*), 0) * 100, 2) as escalation_rate
        FROM offers WHERE ai_confidence IS NOT NULL
      `),
      db.query(`
        SELECT
          item_category,
          COUNT(*) as count,
          AVG(ai_confidence)::numeric(5,2) as avg_confidence,
          COUNT(*) FILTER (WHERE escalated = true) as escalated_count
        FROM offers WHERE item_category IS NOT NULL
        GROUP BY item_category ORDER BY count DESC
      `),
    ]);

    return {
      confidenceDistribution: confidence.rows,
      escalationStats: escalations.rows[0],
      categoryBreakdown: categories.rows,
    };
  });

  /**
   * GET /api/v1/admin/analytics/revenue
   * Revenue and conversion metrics.
   */
  fastify.get('/analytics/revenue', { preHandler: requireAdmin }, async (_request, _reply) => {
    const [daily, byCategory, conversion] = await Promise.all([
      db.query(`
        SELECT
          DATE(created_at) as date,
          COUNT(*) as offers_created,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
          SUM(CASE WHEN status IN ('accepted', 'paid') THEN offer_amount ELSE 0 END)::numeric(12,2) as total_value
        FROM offers
        WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
        GROUP BY DATE(created_at)
        ORDER BY date DESC
      `),
      db.query(`
        SELECT
          item_category,
          COUNT(*) as total_offers,
          SUM(offer_amount)::numeric(12,2) as total_value,
          AVG(offer_amount)::numeric(10,2) as avg_offer
        FROM offers
        WHERE status IN ('accepted', 'paid') AND item_category IS NOT NULL
        GROUP BY item_category ORDER BY total_value DESC
      `),
      db.query(`
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
          COUNT(*) FILTER (WHERE status = 'declined') as declined,
          COUNT(*) FILTER (WHERE status = 'expired') as expired,
          ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::numeric / NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'declined', 'expired')), 0) * 100, 2) as conversion_rate
        FROM offers
      `),
    ]);

    return {
      dailyMetrics: daily.rows,
      categoryRevenue: byCategory.rows,
      conversionStats: conversion.rows[0],
    };
  });

  /**
   * GET /api/v1/admin/analytics/trends
   * Market trends by category over time. Supports date range filtering.
   */
  fastify.get('/analytics/trends', { preHandler: requireAdmin }, async (request, _reply) => {
    const { days = 30, category } = request.query as any;
    const daysNum = Math.min(Math.max(parseInt(days), 7), 365);

    const cached = await cache.get<any>(`admin:analytics:trends:${daysNum}:${category || 'all'}`);
    if (cached) return cached;

    const categoryFilter = category ? 'AND item_category = $2' : '';
    const params = category ? [daysNum, category] : [daysNum];

    const trends = await db.query(`
      SELECT
        DATE(created_at) as date,
        item_category,
        COUNT(*) as total_offers,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted_count,
        ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::numeric / NULLIF(COUNT(*), 0) * 100, 1) as acceptance_rate,
        AVG(offer_amount)::numeric(10,2) as avg_offer,
        STDDEV(offer_amount)::numeric(10,2) as price_volatility,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY offer_amount)::numeric(10,2) as median_offer,
        AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 86400)::numeric(5,2) as avg_days_to_accept
      FROM offers
      WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1 ${categoryFilter}
        AND offer_amount IS NOT NULL
      GROUP BY DATE(created_at), item_category
      ORDER BY date DESC, item_category
    `, params);

    const result = { trends: trends.rows, days: daysNum };
    await cache.set(`admin:analytics:trends:${daysNum}:${category || 'all'}`, result, cache.ttl.analytics);
    return result;
  });

  /**
   * GET /api/v1/admin/analytics/category-insights
   * Deep category performance analysis with acceptance rates and timing.
   */
  fastify.get('/analytics/category-insights', { preHandler: requireAdmin }, async (_request, _reply) => {
    const cached = await cache.get<any>('admin:analytics:category-insights');
    if (cached) return cached;

    const insights = await db.query(`
      SELECT
        item_category,
        COUNT(*) as total_offers,
        COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
        COUNT(*) FILTER (WHERE status = 'declined') as declined,
        ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::numeric / NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'declined')), 0) * 100, 1) as acceptance_rate,
        AVG(offer_amount)::numeric(10,2) as avg_offer,
        MAX(offer_amount)::numeric(10,2) as max_offer,
        MIN(offer_amount)::numeric(10,2) as min_offer,
        STDDEV(offer_amount)::numeric(10,2) as volatility,
        AVG(EXTRACT(EPOCH FROM (accepted_at - created_at)) / 86400)::numeric(5,2) as avg_days_to_accept,
        AVG(ai_confidence)::numeric(5,2) as avg_ai_confidence,
        COUNT(*) FILTER (WHERE escalated = true) as escalated_count,
        SUM(CASE WHEN status = 'accepted' THEN offer_amount ELSE 0 END)::numeric(12,2) as total_revenue
      FROM offers
      WHERE item_category IS NOT NULL
        AND created_at >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY item_category
      ORDER BY total_offers DESC
    `);

    const result = { insights: insights.rows };
    await cache.set('admin:analytics:category-insights', result, cache.ttl.analytics);
    return result;
  });

  /**
   * GET /api/v1/admin/analytics/best-time-to-sell
   * Optimal timing analysis - best days and hours for selling by category.
   */
  fastify.get('/analytics/best-time-to-sell', { preHandler: requireAdmin }, async (_request, _reply) => {
    const cached = await cache.get<any>('admin:analytics:best-time');
    if (cached) return cached;

    const [byDayOfWeek, byHourOfDay, byCategory] = await Promise.all([
      // Day of week analysis
      db.query(`
        SELECT
          EXTRACT(DOW FROM created_at)::int as day_of_week,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
          ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::numeric / NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'declined')), 0) * 100, 1) as acceptance_rate,
          AVG(offer_amount)::numeric(10,2) as avg_offer
        FROM offers
        WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY day_of_week
        ORDER BY day_of_week
      `),
      // Hour of day analysis
      db.query(`
        SELECT
          EXTRACT(HOUR FROM created_at)::int as hour,
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
          ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::numeric / NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'declined')), 0) * 100, 1) as acceptance_rate
        FROM offers
        WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
        GROUP BY hour
        ORDER BY hour
      `),
      // Best time by category
      db.query(`
        SELECT
          item_category,
          EXTRACT(DOW FROM created_at)::int as best_day,
          COUNT(*) as offers,
          ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::numeric / NULLIF(COUNT(*) FILTER (WHERE status IN ('accepted', 'declined')), 0) * 100, 1) as acceptance_rate
        FROM offers
        WHERE created_at >= CURRENT_DATE - INTERVAL '90 days'
          AND item_category IS NOT NULL
        GROUP BY item_category, best_day
        ORDER BY item_category, acceptance_rate DESC NULLS LAST
      `),
    ]);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const byDayNamed = byDayOfWeek.rows.map(row => ({
      ...row,
      day_name: dayNames[row.day_of_week],
    }));

    const result = {
      byDayOfWeek: byDayNamed,
      byHourOfDay: byHourOfDay.rows,
      byCategoryAndDay: byCategory.rows,
    };

    await cache.set('admin:analytics:best-time', result, cache.ttl.analytics);
    return result;
  });

  /**
   * GET /api/v1/admin/analytics/price-distribution/:category
   * Price distribution histogram for a specific category.
   */
  fastify.get('/analytics/price-distribution/:category', { preHandler: requireAdmin }, async (request, _reply) => {
    const { category } = request.params as any;

    const cached = await cache.get<any>(`admin:analytics:price-dist:${category}`);
    if (cached) return cached;

    const distribution = await db.query(`
      WITH price_stats AS (
        SELECT
          MIN(offer_amount) as min_price,
          MAX(offer_amount) as max_price,
          (MAX(offer_amount) - MIN(offer_amount)) / 10.0 as bucket_size
        FROM offers
        WHERE item_category = $1 AND offer_amount IS NOT NULL
      ),
      buckets AS (
        SELECT
          FLOOR((offer_amount - (SELECT min_price FROM price_stats)) / NULLIF((SELECT bucket_size FROM price_stats), 0))::int as bucket,
          COUNT(*) as count,
          AVG(offer_amount)::numeric(10,2) as avg_price
        FROM offers
        WHERE item_category = $1 AND offer_amount IS NOT NULL
        GROUP BY bucket
      )
      SELECT
        bucket,
        count,
        avg_price,
        (bucket * (SELECT bucket_size FROM price_stats) + (SELECT min_price FROM price_stats))::numeric(10,2) as bucket_min,
        ((bucket + 1) * (SELECT bucket_size FROM price_stats) + (SELECT min_price FROM price_stats))::numeric(10,2) as bucket_max
      FROM buckets
      ORDER BY bucket
    `, [category]);

    const stats = await db.query(`
      SELECT
        COUNT(*) as total_offers,
        AVG(offer_amount)::numeric(10,2) as mean,
        PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY offer_amount)::numeric(10,2) as median,
        MODE() WITHIN GROUP (ORDER BY offer_amount)::numeric(10,2) as mode,
        STDDEV(offer_amount)::numeric(10,2) as std_dev,
        MIN(offer_amount)::numeric(10,2) as min,
        MAX(offer_amount)::numeric(10,2) as max
      FROM offers
      WHERE item_category = $1 AND offer_amount IS NOT NULL
    `, [category]);

    const result = {
      category,
      distribution: distribution.rows,
      stats: stats.rows[0],
    };

    await cache.set(`admin:analytics:price-dist:${category}`, result, cache.ttl.analytics);
    return result;
  });

  /**
   * GET /api/v1/admin/analytics/export
   * Export analytics data as CSV.
   */
  fastify.get('/analytics/export', { preHandler: requireAdmin }, async (request, reply) => {
    const { type, category, days = 30 } = request.query as any;

    let data: any[] = [];
    let filename = 'analytics-export.csv';

    if (type === 'trends') {
      const params = category ? [days, category] : [days];
      const result = await db.query(`
        SELECT
          DATE(created_at) as date,
          item_category,
          COUNT(*) as total_offers,
          COUNT(*) FILTER (WHERE status = 'accepted') as accepted,
          AVG(offer_amount)::numeric(10,2) as avg_offer
        FROM offers
        WHERE created_at >= CURRENT_DATE - INTERVAL '1 day' * $1 ${category ? 'AND item_category = $2' : ''}
        GROUP BY DATE(created_at), item_category
        ORDER BY date DESC, item_category
      `, params);
      data = result.rows;
      filename = `trends-${category || 'all'}-${days}days.csv`;
    } else if (type === 'category-insights') {
      const result = await db.query(`
        SELECT
          item_category,
          COUNT(*) as total,
          ROUND(COUNT(*) FILTER (WHERE status = 'accepted')::numeric / NULLIF(COUNT(*), 0) * 100, 1) as acceptance_rate,
          AVG(offer_amount)::numeric(10,2) as avg_offer
        FROM offers
        WHERE item_category IS NOT NULL
        GROUP BY item_category
        ORDER BY total DESC
      `);
      data = result.rows;
      filename = 'category-insights.csv';
    }

    if (data.length === 0) {
      return reply.status(400).send({ error: 'No data available for export' });
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(h => JSON.stringify(row[h] || '')).join(',')),
    ].join('\n');

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', `attachment; filename="${filename}"`);
    return reply.send(csv);
  });

  // ═══════════════════════════════════════════
  // VERIFICATIONS (WAREHOUSE)
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/admin/verifications
   * List items pending or completed verification at warehouse.
   */
  fastify.get('/verifications', { preHandler: requireRole('warehouse', 'admin', 'super_admin') }, async (request, _reply) => {
    const q = validateQuery(adminListQuerySchema, request.query);

    // Offers that are 'received' and have no verification yet
    const pending = await db.query(`
      SELECT o.id, o.item_brand, o.item_model, o.item_condition, o.offer_amount, o.photos,
             s.tracking_number, s.actual_delivery
      FROM offers o
      JOIN shipments s ON s.offer_id = o.id
      LEFT JOIN verifications v ON v.offer_id = o.id
      WHERE o.status = 'received' AND v.id IS NULL
      ORDER BY s.actual_delivery ASC
      LIMIT $1 OFFSET $2
    `, [q.limit, q.offset]);

    const completed = await db.query(`
      SELECT v.*, o.item_brand, o.item_model, o.offer_amount
      FROM verifications v
      JOIN offers o ON v.offer_id = o.id
      ORDER BY v.verified_at DESC
      LIMIT 20
    `);

    return { pending: pending.rows, completed: completed.rows };
  });

  /**
   * POST /api/v1/admin/verifications
   * Submit a verification result for a received item.
   */
  fastify.post('/verifications', { preHandler: requireRole('warehouse', 'admin', 'super_admin') }, async (request, reply) => {
    const body = request.body as any;
    const adminId = (request as any).userId;

    if (!body.offer_id) return reply.status(400).send({ error: 'offer_id required' });

    const offer = await db.findOne('offers', { id: body.offer_id });
    if (!offer) return reply.status(404).send({ error: 'Offer not found' });
    if (offer.status !== 'received') return reply.status(400).send({ error: 'Offer must be in received status' });

    const shipment = await db.findOne('shipments', { offer_id: body.offer_id });

    const verification = await db.create('verifications', {
      offer_id: body.offer_id,
      shipment_id: shipment?.id || null,
      verified_by: adminId,
      condition_match: body.condition_match ?? true,
      condition_actual: body.condition_actual || offer.item_condition,
      photos_at_receipt: body.photos ? JSON.stringify(body.photos) : null,
      weight_actual: body.weight_actual || null,
      serial_number: body.serial_number || null,
      approved: body.approved ?? true,
      revised_offer: body.revised_offer || null,
      revision_reason: body.revision_reason || null,
      notes: body.notes || null,
    });

    // Update offer status based on verification
    const newStatus = body.approved ? 'verified' : 'disputed';
    const offerUpdates: Record<string, any> = { status: newStatus };
    if (body.revised_offer) offerUpdates.offer_amount = body.revised_offer;

    await db.update('offers', { id: body.offer_id }, offerUpdates);
    await cache.del(cache.keys.offer(body.offer_id));

    // If approved, auto-create a payout
    if (body.approved) {
      const payoutAmount = body.revised_offer || parseFloat(offer.offer_amount);
      await db.create('payouts', {
        user_id: offer.user_id,
        offer_id: body.offer_id,
        amount: payoutAmount,
        method: 'paypal', // Default, user can change
        status: 'pending',
        fee: 0,
        net_amount: payoutAmount,
      });
    }

    await auditLog('verification', verification.id, 'item_verified', adminId, null, verification);
    return { verification };
  });

  // ═══════════════════════════════════════════
  // ADMIN LOGIN (separate from user auth)
  // ═══════════════════════════════════════════

  /**
   * POST /api/v1/admin/login
   * Admin-specific login that verifies role.
   */
  fastify.post('/login', async (request, reply) => {
    const { email, password } = request.body as any;

    if (!email || !password) return reply.status(400).send({ error: 'Email and password required' });

    const result = await db.query(
      `SELECT id, email, name, role, banned
       FROM users
       WHERE email = $1 AND password_hash = crypt($2, password_hash)`,
      [email.toLowerCase(), password],
    );

    if (result.rows.length === 0) {
      return reply.status(401).send({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];

    if (!['admin', 'super_admin', 'reviewer', 'warehouse'].includes(user.role)) {
      return reply.status(403).send({ error: 'Not authorized for admin access' });
    }

    if (user.banned) {
      return reply.status(403).send({ error: 'Account suspended' });
    }

    const accessToken = fastify.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      { expiresIn: '4h' },
    );
    const refreshToken = crypto.randomUUID();
    await cache.set(`refresh:admin:${refreshToken}`, { userId: user.id }, 86400);

    await auditLog('user', user.id, 'admin_login', user.id, null, { email: user.email });

    return {
      user: { id: user.id, email: user.email, name: user.name, role: user.role },
      accessToken,
      refreshToken,
    };
  });

  // ═══════════════════════════════════════════
  // PRICE OPTIMIZER
  // ═══════════════════════════════════════════

  /**
   * GET /api/v1/admin/pricing/history/:offerId
   * Get price change history for an offer.
   */
  fastify.get('/pricing/history/:offerId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { offerId } = request.params as { offerId: string };

    const history = await db.query(
      `SELECT
        id,
        old_price,
        new_price,
        price_delta,
        price_delta_percent,
        reason,
        trigger_type,
        days_since_created,
        view_count,
        views_per_day,
        changed_by,
        notes,
        created_at
      FROM price_history
      WHERE offer_id = $1
      ORDER BY created_at DESC`,
      [offerId]
    );

    return { history: history.rows };
  });

  /**
   * POST /api/v1/admin/pricing/toggle-auto/:offerId
   * Enable/disable auto-pricing for a specific offer.
   */
  fastify.post('/pricing/toggle-auto/:offerId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { offerId } = request.params as { offerId: string };
    const { enabled } = request.body as { enabled: boolean };
    const adminUser = (request as any).user;

    const offer = await db.findOne('offers', { id: offerId });
    if (!offer) {
      return reply.status(404).send({ error: 'Offer not found' });
    }

    const updated = await db.update(
      'offers',
      { id: offerId },
      { auto_pricing_enabled: enabled }
    );

    await auditLog('offer', offerId, 'auto_pricing_toggled', adminUser.sub, {
      auto_pricing_enabled: offer.auto_pricing_enabled,
    }, {
      auto_pricing_enabled: enabled,
    });

    logger.info({
      offerId,
      enabled,
      adminId: adminUser.sub,
    }, 'Auto-pricing toggled');

    return { success: true, offer: updated };
  });

  /**
   * POST /api/v1/admin/pricing/lock/:offerId
   * Lock/unlock price (prevents all auto-pricing).
   */
  fastify.post('/pricing/lock/:offerId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { offerId } = request.params as { offerId: string };
    const { locked } = request.body as { locked: boolean };
    const adminUser = (request as any).user;

    const offer = await db.findOne('offers', { id: offerId });
    if (!offer) {
      return reply.status(404).send({ error: 'Offer not found' });
    }

    const updated = await db.update(
      'offers',
      { id: offerId },
      { price_locked: locked }
    );

    await auditLog('offer', offerId, 'price_lock_toggled', adminUser.sub, {
      price_locked: offer.price_locked,
    }, {
      price_locked: locked,
    });

    logger.info({
      offerId,
      locked,
      adminId: adminUser.sub,
    }, 'Price lock toggled');

    return { success: true, offer: updated };
  });

  /**
   * POST /api/v1/admin/pricing/manual-adjust/:offerId
   * Manually adjust offer price.
   */
  fastify.post('/pricing/manual-adjust/:offerId', {
    preHandler: requireAdmin,
  }, async (request, reply) => {
    const { offerId } = request.params as { offerId: string };
    const { newPrice, reason } = request.body as { newPrice: number; reason: string };
    const adminUser = (request as any).user;

    const offer = await db.findOne('offers', { id: offerId });
    if (!offer) {
      return reply.status(404).send({ error: 'Offer not found' });
    }

    if (newPrice <= 0) {
      return reply.status(400).send({ error: 'Price must be greater than 0' });
    }

    const oldPrice = offer.offer_amount;

    // Update offer price
    const updated = await db.update(
      'offers',
      { id: offerId },
      { offer_amount: newPrice, last_price_optimization: new Date() }
    );

    // Record in price history
    await db.create('price_history', {
      offer_id: offerId,
      old_price: oldPrice,
      new_price: newPrice,
      reason: reason || 'admin_manual_adjustment',
      trigger_type: 'manual',
      changed_by: adminUser.sub,
      notes: reason,
    });

    await auditLog('offer', offerId, 'price_manually_adjusted', adminUser.sub, {
      offer_amount: oldPrice,
    }, {
      offer_amount: newPrice,
    });

    logger.info({
      offerId,
      oldPrice,
      newPrice,
      adminId: adminUser.sub,
      reason,
    }, 'Price manually adjusted');

    return { success: true, offer: updated };
  });

  /**
   * POST /api/v1/admin/pricing/trigger-optimizer
   * Manually trigger price optimizer job (super-admin only).
   */
  fastify.post('/pricing/trigger-optimizer', {
    preHandler: requireRole('super_admin'),
  }, async (request, reply) => {
    const { dryRun = false } = request.body as { dryRun?: boolean };
    const adminUser = (request as any).user;

    const { triggerPriceOptimizerNow } = await import('../../queue/scheduler.js');

    const job = await triggerPriceOptimizerNow(dryRun);

    await auditLog('system', 'price_optimizer', 'manual_trigger', adminUser.sub, null, {
      dryRun,
      jobId: job.id,
    });

    logger.info({
      jobId: job.id,
      dryRun,
      adminId: adminUser.sub,
    }, 'Price optimizer manually triggered');

    return {
      success: true,
      jobId: job.id,
      dryRun,
      message: dryRun ? 'Dry run triggered - no changes will be applied' : 'Optimizer triggered',
    };
  });

  /**
   * GET /api/v1/admin/pricing/optimizer-stats
   * Get price optimizer effectiveness stats.
   */
  fastify.get('/pricing/optimizer-stats', {
    preHandler: requireAdmin,
  }, async (_request, _reply) => {
    const stats = await db.query(`
      WITH recent_optimizations AS (
        SELECT
          COUNT(*) as total_adjustments,
          SUM(price_delta) as total_reduction,
          AVG(price_delta_percent) as avg_reduction_pct,
          MIN(created_at) as first_optimization,
          MAX(created_at) as last_optimization
        FROM price_history
        WHERE trigger_type = 'auto'
          AND created_at >= NOW() - INTERVAL '30 days'
      ),
      velocity_breakdown AS (
        SELECT
          reason,
          COUNT(*) as count,
          AVG(price_delta_percent) as avg_reduction
        FROM price_history
        WHERE trigger_type = 'auto'
          AND created_at >= NOW() - INTERVAL '30 days'
        GROUP BY reason
      )
      SELECT
        ro.total_adjustments,
        ro.total_reduction,
        ro.avg_reduction_pct,
        ro.first_optimization,
        ro.last_optimization,
        json_agg(
          json_build_object(
            'reason', vb.reason,
            'count', vb.count,
            'avg_reduction', vb.avg_reduction
          )
        ) as breakdown
      FROM recent_optimizations ro
      CROSS JOIN velocity_breakdown vb
      GROUP BY ro.total_adjustments, ro.total_reduction, ro.avg_reduction_pct,
               ro.first_optimization, ro.last_optimization
    `);

    return stats.rows[0] || {
      total_adjustments: 0,
      total_reduction: 0,
      avg_reduction_pct: 0,
      breakdown: [],
    };
  });

}
