/**
 * Offer Orchestrator — the core pipeline that ties all agents together.
 *
 * Flow: Photo Upload → Vision → Marketplace → Pricing → Jake Voice → Offer Ready
 *
 * Each stage updates the offer record and broadcasts progress via Redis.
 * The frontend polls GET /offers/:id to track stage transitions.
 */
import { db } from '../db/client.js';
import { cache } from '../db/redis.js';
import { addJob } from '../queue/workers.js';
import { logger } from '../utils/logger.js';
import { config } from '../config.js';
import { fraudClient } from '../integrations/fraud-client.js';
import { profitCalculator } from './profit-calculator.js';

export type OfferStage = 'uploaded' | 'vision' | 'marketplace' | 'pricing' | 'fraud-check' | 'jake-voice' | 'ready' | 'escalated' | 'failed';

const STAGE_CACHE_TTL = 600; // 10 minutes — transient processing data

export const offerOrchestrator = {
  /**
   * Create a new offer and kick off the pipeline.
   */
  async createOffer(
    userId: string | null,
    photoUrls: string[],
    userDescription?: string,
  ): Promise<{ offerId: string }> {
    // Create offer record
    const offer = await db.create('offers', {
      user_id: userId,
      status: 'processing',
      photos: JSON.stringify(photoUrls.map((url) => ({ url, uploaded_at: new Date().toISOString() }))),
      user_description: userDescription || null,
      offer_amount: 0, // placeholder until pricing completes
      expires_at: new Date(Date.now() + config.businessRules.offerExpiryHours * 3600_000).toISOString(),
    });

    const offerId = offer.id;
    logger.info({ offerId, photoCount: photoUrls.length }, 'Offer created, starting pipeline');

    // Set initial stage
    await this.setStage(offerId, 'uploaded');

    // Queue vision job — first stage of the pipeline
    await addJob('vision-identify', {
      offerId,
      photoUrls,
      userDescription,
    }, {
      jobId: `vision-${offerId}`,
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
    });

    await this.setStage(offerId, 'vision');

    return { offerId };
  },

  /**
   * Update the processing stage and cache it for fast polling.
   */
  async setStage(offerId: string, stage: OfferStage): Promise<void> {
    const key = `offer:${offerId}:stage`;
    await cache.set(key, { stage, updatedAt: new Date().toISOString() }, STAGE_CACHE_TTL);
    logger.info({ offerId, stage }, 'Offer stage updated');
  },

  /**
   * Get current processing stage from cache.
   */
  async getStage(offerId: string): Promise<{ stage: OfferStage; updatedAt: string } | null> {
    return cache.get(`offer:${offerId}:stage`);
  },

  /**
   * Called when vision job completes — store results, chain to marketplace.
   */
  async onVisionComplete(offerId: string, visionResult: {
    category: string;
    subcategory: string;
    brand: string;
    model: string;
    condition: string;
    features: string[];
    damage: string[];
    confidence: number;
    identifiers: Record<string, string>;
    // New fields from Phase 1 enhancements
    conditionGrade?: string; // 'Excellent', 'Good', 'Fair', 'Poor'
    conditionNotes?: string; // Detailed defect descriptions
    seoTitle?: string; // SEO-optimized title (Phase 4)
    // Phase 4 Team 1: Enhanced metadata and serial
    productMetadata?: {
      brand?: string;
      model?: string;
      variant?: string;
      storage?: string;
      color?: string;
      year?: number;
      generation?: string;
      condition_specifics?: Record<string, any>;
    };
    serialInfo?: {
      serial_number?: string;
      confidence?: number;
      method?: string;
      location?: string;
      imei?: string;
    };
  }): Promise<void> {
    // Update offer with vision data
    await db.update('offers', { id: offerId }, {
      item_category: visionResult.category,
      item_subcategory: visionResult.subcategory,
      item_brand: visionResult.brand,
      item_model: visionResult.model,
      item_condition: visionResult.condition,
      item_features: JSON.stringify(visionResult.features),
      item_damage: JSON.stringify(visionResult.damage),
      ai_identification: JSON.stringify(visionResult),
      ai_confidence: visionResult.confidence,
      ai_model_used: 'claude-3-5-sonnet',
      // Store condition assessment from vision AI
      condition_grade: visionResult.conditionGrade || null,
      condition_notes: visionResult.conditionNotes || null,
      // Store SEO title if generated
      seo_title: visionResult.seoTitle || null,
      // Phase 4 Team 1: Serial number and granular metadata
      serial_number: visionResult.serialInfo?.serial_number || null,
      product_metadata: visionResult.productMetadata ? JSON.stringify(visionResult.productMetadata) : '{}',
    });

    // Check if confidence is too low — escalate
    if (visionResult.confidence < 50) {
      await this.escalate(offerId, 'low_confidence', `Vision confidence ${visionResult.confidence}% below threshold`);
      return;
    }

    // Chain to marketplace research
    await addJob('marketplace-research', {
      offerId,
      brand: visionResult.brand,
      model: visionResult.model,
      category: visionResult.category,
      condition: visionResult.condition,
    }, {
      jobId: `marketplace-${offerId}`,
      attempts: 2,
      backoff: { type: 'exponential', delay: 3000 },
    });

    await this.setStage(offerId, 'marketplace');
  },

  /**
   * Called when marketplace research completes — store results, chain to pricing.
   */
  async onMarketplaceComplete(offerId: string, marketResult: {
    stats: { count: number; median: number; mean: number; std_dev: number };
    sources_checked: string[];
    cache_hit: boolean;
  }): Promise<void> {
    // Store marketplace data
    await db.update('offers', { id: offerId }, {
      market_data: JSON.stringify(marketResult),
    });

    // Not enough comparable data — escalate
    if (marketResult.stats.count < 3) {
      await this.escalate(offerId, 'few_comparables', `Only ${marketResult.stats.count} comparable listings found`);
      return;
    }

    // Fetch the offer to get category + condition for pricing
    const offer = await db.findOne('offers', { id: offerId });
    if (!offer) {
      await this.fail(offerId, `Offer ${offerId} not found when chaining to pricing`);
      return;
    }

    await addJob('pricing-calculate', {
      offerId,
      marketplaceStats: marketResult.stats,
      category: offer.item_category,
      condition: offer.item_condition,
    }, {
      jobId: `pricing-${offerId}`,
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
    });

    await this.setStage(offerId, 'pricing');
  },

  /**
   * Called when pricing completes — store results, chain to jake voice.
   */
  async onPricingComplete(offerId: string, pricingResult: {
    fmv: number;
    fmv_confidence: number;
    offer_amount: number;
    offer_to_market_ratio: number;
    condition_multiplier: number;
    category_margin: number;
    data_quality: string;
    // New fields from Phase 1 enhancements
    pricing_confidence?: number; // 0-100 confidence score
    comparable_sales?: Array<{
      source: string;
      price: number;
      sold_date?: string;
      url?: string;
      title?: string;
      condition: string;
    }>;
    confidence_factors?: {
      score: number;
      data_points: number;
      explanation: string;
    };
  }): Promise<void> {
    // Calculate estimated profit for the seller
    const estimatedShippingCost = 8.50; // Average USPS Priority cost
    const estimatedPlatformFees = 0; // Can be adjusted if crossposting
    const estimatedProfit = pricingResult.fmv - (pricingResult.offer_amount + estimatedShippingCost + estimatedPlatformFees);

    // Update offer with pricing and profit estimation
    await db.update('offers', { id: offerId }, {
      fmv: pricingResult.fmv,
      fmv_confidence: pricingResult.fmv_confidence,
      offer_amount: pricingResult.offer_amount,
      offer_to_market_ratio: pricingResult.offer_to_market_ratio,
      condition_multiplier: pricingResult.condition_multiplier,
      category_margin: pricingResult.category_margin,
      // Store pricing confidence and comparables
      pricing_confidence: pricingResult.pricing_confidence || null,
      // PostgreSQL JSONB accepts JavaScript objects directly via pg driver
      comparable_sales: pricingResult.comparable_sales ? JSON.stringify(pricingResult.comparable_sales) : JSON.stringify([]),
      confidence_explanation: pricingResult.confidence_factors?.explanation || null,
      // Profit estimation
      estimated_profit: estimatedProfit,
      estimated_shipping_cost: estimatedShippingCost,
      estimated_platform_fees: estimatedPlatformFees,
    });

    // High value offers get escalated for human review
    if (pricingResult.offer_amount > 500) {
      await this.escalate(offerId, 'high_value', `Offer $${pricingResult.offer_amount} exceeds auto-approval threshold`);
      return;
    }

    // Check daily spending limit (atomic Lua script prevents race conditions)
    const dailyLimit = config.businessRules.maxOfferAmount * 10;
    const todayKey = `spending:daily:${new Date().toISOString().slice(0, 10)}`;
    const { allowed, newTotal } = await cache.atomicIncrIfUnder(todayKey, pricingResult.offer_amount, dailyLimit, 86400);
    if (!allowed) {
      await this.escalate(offerId, 'daily_limit', `Daily spending limit would be exceeded ($${newTotal} + $${pricingResult.offer_amount} > $${dailyLimit})`);
      return;
    }

    // Fetch offer for fraud check and jake context
    const offer = await db.findOne('offers', { id: offerId });
    if (!offer) {
      await this.fail(offerId, `Offer ${offerId} not found when chaining to fraud-check`);
      return;
    }

    // Run fraud detection analysis
    await this.setStage(offerId, 'fraud-check');

    try {
      // Fetch user data for fraud analysis
      let user = null;
      let userCreatedAt = null;
      let userOfferCount = 0;
      let userTrustScore = 50;

      if (offer.user_id) {
        user = await db.findOne('users', { id: offer.user_id });
        if (user) {
          userCreatedAt = user.created_at;
          userTrustScore = user.trust_score || 50;

          // Count user's total offers
          const userOffers = await db.query(
            'SELECT COUNT(*) as count FROM offers WHERE user_id = $1',
            [offer.user_id]
          );
          userOfferCount = userOffers.rows[0]?.count || 0;
        }
      }

      const fraudResult = await fraudClient.analyzeFraud({
        offer_id: offerId,
        user_id: offer.user_id,
        offer_amount: pricingResult.offer_amount,
        fmv: pricingResult.fmv,
        category: offer.item_category,
        condition: offer.item_condition,
        user_created_at: userCreatedAt,
        user_offer_count: userOfferCount,
        user_trust_score: userTrustScore,
        photo_urls: JSON.parse(offer.photos).map((p: any) => p.url),
        description: offer.user_description,
        // ip_address and user_agent would come from request context
      });

      // Store fraud check result
      await db.create('fraud_checks', {
        user_id: offer.user_id,
        offer_id: offerId,
        check_type: 'ml_analysis',
        result: fraudResult.risk_level === 'low' ? 'pass' : fraudResult.risk_level === 'medium' ? 'flag' : 'fail',
        confidence: fraudResult.confidence,
        risk_score: fraudResult.risk_score,
        risk_level: fraudResult.risk_level,
        flags: JSON.stringify(fraudResult.flags),
        breakdown: JSON.stringify(fraudResult.breakdown),
        explanation: fraudResult.explanation,
        recommended_action: fraudResult.recommended_action,
        action_taken: 'none', // Will be updated if escalation happens
        details: JSON.stringify({
          analyzed_at: fraudResult.analyzed_at,
          flag_count: fraudResult.flags.length,
        }),
      });

      // Handle fraud detection results
      if (fraudResult.recommended_action === 'reject') {
        await db.update('fraud_checks', { offer_id: offerId, check_type: 'ml_analysis' }, {
          action_taken: 'reject',
        });
        await this.escalate(
          offerId,
          'fraud_rejected',
          `Fraud detection: ${fraudResult.explanation} (risk score: ${fraudResult.risk_score})`
        );
        return;
      } else if (fraudResult.recommended_action === 'escalate') {
        await db.update('fraud_checks', { offer_id: offerId, check_type: 'ml_analysis' }, {
          action_taken: 'escalate',
        });
        await this.escalate(
          offerId,
          'fraud_high_risk',
          `Fraud detection flagged high risk: ${fraudResult.explanation} (risk score: ${fraudResult.risk_score})`
        );
        return;
      } else if (fraudResult.recommended_action === 'review' && fraudResult.risk_score >= 60) {
        await db.update('fraud_checks', { offer_id: offerId, check_type: 'ml_analysis' }, {
          action_taken: 'flag',
        });
        // Flag but continue - admin will review later
        logger.warn({ offerId, riskScore: fraudResult.risk_score }, 'Fraud detection flagged for review');
      }

      logger.info(
        { offerId, riskScore: fraudResult.risk_score, riskLevel: fraudResult.risk_level },
        'Fraud check passed, continuing to jake-voice'
      );

    } catch (fraudError: any) {
      // Don't block the pipeline if fraud service is down
      logger.error({ offerId, error: fraudError.message }, 'Fraud check failed, continuing anyway');
      await db.create('fraud_checks', {
        user_id: offer.user_id,
        offer_id: offerId,
        check_type: 'ml_analysis',
        result: 'flag',
        confidence: 0,
        action_taken: 'none',
        details: JSON.stringify({ error: fraudError.message }),
      });
    }

    // Determine jake scenario based on offer ratio
    let scenario: string;
    const ratio = pricingResult.offer_to_market_ratio;
    if (ratio >= 0.7) scenario = 'offer_high';
    else if (ratio >= 0.5) scenario = 'offer_standard';
    else if (ratio >= 0.3) scenario = 'offer_low';
    else scenario = 'offer_very_low';

    await addJob('jake-voice', {
      offerId,
      scenario,
      itemName: `${offer.item_brand} ${offer.item_model}`,
      offerAmount: pricingResult.offer_amount,
      fmv: pricingResult.fmv,
      brand: offer.item_brand,
      category: offer.item_category,
      condition: offer.item_condition,
    }, {
      jobId: `jake-${offerId}`,
      attempts: 2,
      backoff: { type: 'exponential', delay: 2000 },
    });

    await this.setStage(offerId, 'jake-voice');
  },

  /**
   * Called when jake voice generation completes — offer is ready.
   */
  async onJakeVoiceComplete(offerId: string, jakeResult: {
    script: string;
    tone: string;
    animation_state: string;
    tier: number;
    audio_url?: string;
  }): Promise<void> {
    await db.update('offers', { id: offerId }, {
      jake_script: jakeResult.script,
      jake_animation_state: jakeResult.animation_state,
      jake_voice_url: jakeResult.audio_url || null,
      jake_tier: jakeResult.tier,
      status: 'ready',
    });

    await this.setStage(offerId, 'ready');

    // Invalidate cached offer
    await cache.del(cache.keys.offer(offerId));

    logger.info({ offerId }, 'Offer pipeline complete — status: ready');
  },

  /**
   * Escalate an offer for human review.
   */
  async escalate(offerId: string, reason: string, notes: string): Promise<void> {
    // Read existing notes to append (not overwrite)
    const existing = await db.findOne('offers', { id: offerId });
    let existingNotes: Array<{ note: string; at: string }> = [];
    if (existing?.escalation_notes) {
      try {
        existingNotes = JSON.parse(existing.escalation_notes);
      } catch {
        existingNotes = [];
      }
    }
    existingNotes.push({ note: notes, at: new Date().toISOString() });

    await db.update('offers', { id: offerId }, {
      status: 'processing', // keep processing — human will finalize
      escalated: true,
      escalation_reason: reason,
      escalation_notes: JSON.stringify(existingNotes),
    });

    await this.setStage(offerId, 'escalated');

    logger.warn({ offerId, reason, notes }, 'Offer escalated');

    // Queue notification to admin
    await addJob('notifications', {
      type: 'escalation',
      offerId,
      reason,
      notes,
    });
  },

  /**
   * Mark an offer as failed.
   */
  async fail(offerId: string, error: string): Promise<void> {
    // Read existing notes to append (not overwrite)
    const existing = await db.findOne('offers', { id: offerId });
    let existingNotes: Array<{ note: string; at: string }> = [];
    if (existing?.escalation_notes) {
      try {
        existingNotes = JSON.parse(existing.escalation_notes);
      } catch {
        existingNotes = [];
      }
    }
    existingNotes.push({ note: error, at: new Date().toISOString() });

    await db.update('offers', { id: offerId }, {
      status: 'processing',
      escalated: true,
      escalation_reason: 'pipeline_error',
      escalation_notes: JSON.stringify(existingNotes),
    });

    await this.setStage(offerId, 'failed');

    logger.error({ offerId, error }, 'Offer pipeline failed');

    await addJob('notifications', {
      type: 'pipeline_failure',
      offerId,
      error,
    });
  },
};
