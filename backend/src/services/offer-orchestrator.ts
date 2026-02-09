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

export type OfferStage = 'uploaded' | 'vision' | 'marketplace' | 'pricing' | 'jake-voice' | 'ready' | 'escalated' | 'failed';

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
  }): Promise<void> {
    // Update offer with pricing
    await db.update('offers', { id: offerId }, {
      fmv: pricingResult.fmv,
      fmv_confidence: pricingResult.fmv_confidence,
      offer_amount: pricingResult.offer_amount,
      offer_to_market_ratio: pricingResult.offer_to_market_ratio,
      condition_multiplier: pricingResult.condition_multiplier,
      category_margin: pricingResult.category_margin,
    });

    // High value offers get escalated for human review
    if (pricingResult.offer_amount > 500) {
      await this.escalate(offerId, 'high_value', `Offer $${pricingResult.offer_amount} exceeds auto-approval threshold`);
      return;
    }

    // Check daily spending limit (atomic increment to prevent race conditions)
    const dailyLimit = config.businessRules.maxOfferAmount * 10;
    const todayKey = `spending:daily:${new Date().toISOString().slice(0, 10)}`;
    const newTotal = await cache.incrByFloatWithExpiry(todayKey, pricingResult.offer_amount, 86400);
    if (newTotal > dailyLimit) {
      // Roll back the increment since we're rejecting this offer
      await cache.incrByFloatWithExpiry(todayKey, -pricingResult.offer_amount, 86400);
      await this.escalate(offerId, 'daily_limit', `Daily spending limit would be exceeded ($${newTotal - pricingResult.offer_amount} + $${pricingResult.offer_amount} > $${dailyLimit})`);
      return;
    }

    // Fetch offer for jake context
    const offer = await db.findOne('offers', { id: offerId });

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
    await db.update('offers', { id: offerId }, {
      status: 'processing', // keep processing — human will finalize
      escalated: true,
      escalation_reason: reason,
      escalation_notes: JSON.stringify([{ note: notes, at: new Date().toISOString() }]),
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
    await db.update('offers', { id: offerId }, {
      status: 'processing',
      escalated: true,
      escalation_reason: 'pipeline_error',
      escalation_notes: JSON.stringify([{ note: error, at: new Date().toISOString() }]),
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
