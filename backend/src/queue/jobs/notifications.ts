/**
 * Notifications Job Handler — sends alerts for escalations, failures, and offer updates.
 * Logs all notifications; Telegram integration is placeholder for now.
 */
import { Job } from 'bullmq';
import { logger } from '../../utils/logger.js';

interface NotificationJobData {
  type: 'escalation' | 'pipeline_failure' | 'offer_ready' | 'offer_accepted';
  offerId: string;
  reason?: string;
  notes?: string;
  error?: string;
}

export async function processNotificationJob(job: Job<NotificationJobData>): Promise<void> {
  const { type, offerId, reason, error } = job.data;

  logger.info({ type, offerId, reason, error }, 'Processing notification');

  switch (type) {
    case 'escalation':
      // TODO: Send Telegram message to admin chat
      // await telegram.sendMessage(config.telegram.adminChatId, `...`);
      logger.warn({ offerId, reason }, 'ESCALATION — admin notification queued');
      break;

    case 'pipeline_failure':
      logger.error({ offerId, error }, 'PIPELINE FAILURE — admin notification queued');
      break;

    case 'offer_ready':
      // TODO: Send push notification to user
      logger.info({ offerId }, 'Offer ready — user notification queued');
      break;

    case 'offer_accepted':
      // TODO: Trigger shipping label generation
      logger.info({ offerId }, 'Offer accepted — shipping label flow queued');
      break;
  }
}
