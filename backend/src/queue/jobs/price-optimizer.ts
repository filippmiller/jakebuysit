/**
 * Price Optimizer Job Handler
 * Runs daily at 2 AM to scan stale listings and apply time-decay pricing.
 *
 * Process:
 * 1. Fetch all "ready" offers older than 7 days
 * 2. Filter out price-locked offers
 * 3. Call Python optimizer service
 * 4. Apply recommended price changes
 * 5. Log all changes to price_history
 */
import { Job } from 'bullmq';
import { db } from '../../db/client.js';
import { agent2 } from '../../integrations/agent2-client.js';
import { logger } from '../../utils/logger.js';

interface PriceOptimizerJobData {
  dryRun?: boolean; // Preview mode - don't apply changes
  minDaysActive?: number; // Minimum days old (default: 7)
}

interface Offer {
  id: string;
  offer_amount: number;
  created_at: Date;
  view_count: number;
  last_price_optimization: Date | null;
  auto_pricing_enabled: boolean;
  price_locked: boolean;
  price_floor: number | null;
}

export async function processPriceOptimizerJob(
  job: Job<PriceOptimizerJobData>
): Promise<{
  scanned: number;
  adjusted: number;
  skipped: number;
  total_reduction: number;
  changes: Array<{ offer_id: string; old_price: number; new_price: number; reason: string }>;
}> {
  const { dryRun = false, minDaysActive = 7 } = job.data;

  logger.info(
    {
      jobId: job.id,
      dryRun,
      minDaysActive,
    },
    'Price optimizer job started'
  );

  // Find all ready offers older than minDaysActive
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - minDaysActive);

  const offers = await db.query<Offer>(
    `
    SELECT
      id,
      offer_amount,
      created_at,
      COALESCE(view_count, 0) as view_count,
      last_price_optimization,
      auto_pricing_enabled,
      price_locked,
      price_floor
    FROM offers
    WHERE status = 'ready'
      AND created_at < $1
      AND auto_pricing_enabled = true
      AND price_locked = false
    ORDER BY created_at ASC
    `,
    [cutoffDate]
  );

  const staleOffers = offers.rows;

  logger.info(
    {
      total: staleOffers.length,
      cutoffDate,
    },
    'Found stale offers for optimization'
  );

  if (staleOffers.length === 0) {
    return {
      scanned: 0,
      adjusted: 0,
      skipped: 0,
      total_reduction: 0,
      changes: [],
    };
  }

  // Prepare data for Python optimizer
  const offerData = staleOffers.map((offer) => ({
    offer_id: offer.id,
    current_price: offer.offer_amount,
    original_offer: offer.offer_amount, // Assume current is original (could track separately)
    created_at: offer.created_at.toISOString(),
    view_count: offer.view_count,
    last_optimized: offer.last_price_optimization?.toISOString() || null,
  }));

  // Call Python optimizer service
  let recommendations: Record<string, any>;
  try {
    recommendations = await agent2.optimizePrices(offerData);
  } catch (err: any) {
    logger.error(
      {
        error: err.message,
      },
      'Failed to get price recommendations from Agent 2'
    );
    throw err;
  }

  // Process recommendations
  const changes: Array<{
    offer_id: string;
    old_price: number;
    new_price: number;
    reason: string;
  }> = [];
  let adjusted = 0;
  let skipped = 0;
  let totalReduction = 0;

  for (const offer of staleOffers) {
    const rec = recommendations[offer.id];

    if (!rec || !rec.should_adjust) {
      skipped++;
      logger.debug(
        {
          offerId: offer.id,
          reason: rec?.reason || 'no_recommendation',
        },
        'Skipping offer - no price change needed'
      );
      continue;
    }

    const oldPrice = offer.offer_amount;
    const newPrice = rec.recommended_price;
    const reduction = oldPrice - newPrice;

    // Safety check - don't reduce below price floor
    const priceFloor = offer.price_floor || oldPrice * 1.2;
    if (newPrice < priceFloor) {
      logger.warn(
        {
          offerId: offer.id,
          newPrice,
          priceFloor,
        },
        'Recommended price below floor - adjusting to floor'
      );
      // This should already be handled by optimizer, but double-check
      continue;
    }

    changes.push({
      offer_id: offer.id,
      old_price: oldPrice,
      new_price: newPrice,
      reason: rec.reason,
    });

    totalReduction += reduction;

    if (!dryRun) {
      // Apply price change and record history atomically within transaction
      await db.transaction(async (trx) => {
        // Update offer price
        await trx.update(
          'offers',
          { id: offer.id },
          {
            offer_amount: newPrice,
            last_price_optimization: new Date(),
          }
        );

        // Record in price history
        await trx.create('price_history', {
          offer_id: offer.id,
          old_price: oldPrice,
          new_price: newPrice,
          reason: rec.reason,
          trigger_type: 'auto',
          days_since_created: rec.days_active,
          view_count: rec.view_count || 0,
          views_per_day: rec.velocity || 0,
          changed_by: null, // System automated
          notes: `Auto-optimized: ${rec.reduction_percent.toFixed(1)}% reduction`,
        });
      });

      adjusted++;

      logger.info(
        {
          offerId: offer.id,
          oldPrice,
          newPrice,
          reduction,
          reason: rec.reason,
        },
        'Price optimized'
      );
    } else {
      logger.info(
        {
          offerId: offer.id,
          oldPrice,
          newPrice,
          reduction,
          reason: rec.reason,
        },
        '[DRY RUN] Would optimize price'
      );
      adjusted++;
    }
  }

  const result = {
    scanned: staleOffers.length,
    adjusted,
    skipped,
    total_reduction: totalReduction,
    changes,
  };

  logger.info(
    result,
    dryRun
      ? 'Price optimizer job completed (DRY RUN)'
      : 'Price optimizer job completed'
  );

  return result;
}
