/**
 * Pricing Job Handler — calls Agent 2 to calculate FMV and generate offer.
 * On success, chains to jake-voice via the orchestrator.
 */
import { Job } from 'bullmq';
import { agent2 } from '../../integrations/agent2-client.js';
import { offerOrchestrator } from '../../services/offer-orchestrator.js';
import { logger } from '../../utils/logger.js';

interface PricingJobData {
  offerId: string;
  marketplaceStats: {
    count: number;
    median: number;
    mean: number;
    std_dev: number;
    percentiles: { p25: number; p50: number; p75: number };
    min_price?: number;
    max_price?: number;
  };
  category: string;
  condition: string;
}

export async function processPricingJob(job: Job<PricingJobData>): Promise<void> {
  const { offerId, marketplaceStats, category, condition } = job.data;
  logger.info({ offerId, jobId: job.id, category, condition }, 'Pricing job started');

  try {
    const result = await agent2.price(marketplaceStats, category, condition);

    logger.info({
      offerId,
      fmv: result.fmv,
      offerAmount: result.offer_amount,
      ratio: result.offer_to_market_ratio,
    }, 'Pricing complete');

    await offerOrchestrator.onPricingComplete(offerId, result);
  } catch (err: any) {
    logger.error({ offerId, error: err.message }, 'Pricing job failed');

    if (job.attemptsMade >= (job.opts.attempts || 1) - 1) {
      await offerOrchestrator.escalate(offerId, 'pipeline_error', `Pricing failed: ${err.message}`);
    }

    throw err;
  }
}
