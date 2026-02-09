/**
 * Marketplace Job Handler — calls Agent 2 to research prices.
 * On success, chains to pricing via the orchestrator.
 */
import { Job } from 'bullmq';
import { agent2 } from '../../integrations/agent2-client.js';
import { offerOrchestrator } from '../../services/offer-orchestrator.js';
import { logger } from '../../utils/logger.js';

interface MarketplaceJobData {
  offerId: string;
  brand: string;
  model: string;
  category: string;
  condition: string;
}

export async function processMarketplaceJob(job: Job<MarketplaceJobData>): Promise<void> {
  const { offerId, brand, model, category, condition } = job.data;
  logger.info({ offerId, jobId: job.id, brand, model }, 'Marketplace job started');

  try {
    const result = await agent2.research(brand, model, category, condition);

    logger.info({
      offerId,
      listingCount: result.stats.count,
      median: result.stats.median,
      cacheHit: result.cache_hit,
    }, 'Marketplace research complete');

    await offerOrchestrator.onMarketplaceComplete(offerId, result);
  } catch (err: any) {
    logger.error({ offerId, error: err.message }, 'Marketplace job failed');

    if (job.attemptsMade >= (job.opts.attempts || 1) - 1) {
      await offerOrchestrator.escalate(offerId, 'pipeline_error', `Marketplace research failed: ${err.message}`);
    }

    throw err;
  }
}
