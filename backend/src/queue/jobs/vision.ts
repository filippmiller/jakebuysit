/**
 * Vision Job Handler — calls Agent 2 to identify items from photos.
 * On success, chains to marketplace research via the orchestrator.
 */
import { Job } from 'bullmq';
import { agent2 } from '../../integrations/agent2-client.js';
import { offerOrchestrator } from '../../services/offer-orchestrator.js';
import { logger } from '../../utils/logger.js';

interface VisionJobData {
  offerId: string;
  photoUrls: string[];
  userDescription?: string;
}

export async function processVisionJob(job: Job<VisionJobData>): Promise<void> {
  const { offerId, photoUrls, userDescription } = job.data;
  logger.info({ offerId, jobId: job.id, photoCount: photoUrls.length }, 'Vision job started');

  try {
    const result = await agent2.identify(photoUrls, userDescription);

    logger.info({
      offerId,
      brand: result.brand,
      model: result.model,
      confidence: result.confidence,
    }, 'Vision identification complete');

    await offerOrchestrator.onVisionComplete(offerId, result);
  } catch (err: any) {
    logger.error({ offerId, error: err.message }, 'Vision job failed');

    // On final attempt, escalate rather than silently fail
    if (job.attemptsMade >= (job.opts.attempts || 1) - 1) {
      await offerOrchestrator.escalate(offerId, 'pipeline_error', `Vision failed: ${err.message}`);
    }

    throw err; // Let BullMQ handle retry
  }
}
