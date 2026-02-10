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
  base64Photos?: Array<{ data: string; mediaType: string }>;
  userDescription?: string;
}

export async function processVisionJob(job: Job<VisionJobData>): Promise<void> {
  const { offerId, photoUrls, base64Photos, userDescription } = job.data;
  const totalPhotos = photoUrls.length + (base64Photos?.length || 0);
  logger.info({ offerId, jobId: job.id, photoCount: totalPhotos }, 'Vision job started');

  try {
    // Pass both URL and base64 photos to agent2
    const result = await agent2.identify(photoUrls, userDescription, base64Photos);

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
