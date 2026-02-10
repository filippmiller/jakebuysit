/**
 * BullMQ Scheduled Jobs
 * Sets up recurring jobs (cron-like scheduling).
 */
import { Queue } from 'bullmq';
import { logger } from '../utils/logger.js';
import { getQueue } from './workers.js';

/**
 * Schedule the price optimizer job to run daily at 2 AM.
 */
export async function schedulePriceOptimizer() {
  const queue = getQueue('price-optimizer');

  // Remove any existing repeatable jobs first
  const repeatableJobs = await queue.getRepeatableJobs();
  for (const job of repeatableJobs) {
    if (job.name === 'daily-price-optimization') {
      await queue.removeRepeatableByKey(job.key);
      logger.info({ key: job.key }, 'Removed existing price optimizer schedule');
    }
  }

  // Schedule daily at 2 AM (cron: 0 2 * * *)
  await queue.add(
    'daily-price-optimization',
    {
      dryRun: false,
      minDaysActive: 7,
    },
    {
      repeat: {
        pattern: '0 2 * * *', // Every day at 2:00 AM
      },
      removeOnComplete: {
        count: 30, // Keep last 30 runs
      },
      removeOnFail: {
        count: 100, // Keep last 100 failures for debugging
      },
    }
  );

  logger.info('Price optimizer scheduled (daily at 2 AM)');
}

/**
 * Initialize all scheduled jobs.
 */
export async function setupScheduledJobs() {
  try {
    await schedulePriceOptimizer();
    logger.info('Scheduled jobs initialized');
  } catch (err) {
    logger.error({ err }, 'Failed to setup scheduled jobs');
    throw err;
  }
}

/**
 * Trigger price optimizer manually (for testing or admin control).
 */
export async function triggerPriceOptimizerNow(dryRun: boolean = false) {
  const queue = getQueue('price-optimizer');

  const job = await queue.add(
    'manual-price-optimization',
    {
      dryRun,
      minDaysActive: 7,
    },
    {
      priority: 1, // High priority for manual triggers
    }
  );

  logger.info({ jobId: job.id, dryRun }, 'Manual price optimizer job triggered');

  return job;
}
