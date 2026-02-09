import { Worker, Queue } from 'bullmq';
import { getRedis } from '../db/redis.js';
import { logger } from '../utils/logger.js';
import { processVisionJob } from './jobs/vision.js';
import { processMarketplaceJob } from './jobs/marketplace.js';
import { processPricingJob } from './jobs/pricing.js';
import { processJakeVoiceJob } from './jobs/jake-voice.js';
import { processNotificationJob } from './jobs/notifications.js';

// Queue configurations
const queueConfigs = {
  'vision-identify': { concurrency: 10, priority: 1 },
  'marketplace-research': { concurrency: 20, priority: 2 },
  'pricing-calculate': { concurrency: 50, priority: 1 },
  'jake-voice': { concurrency: 10, priority: 3 },
  'notifications': { concurrency: 100, priority: 4 },
};

const queues: Record<string, Queue> = {};
const workers: Worker[] = [];

export async function setupQueues() {
  const redis = getRedis();
  const connection = {
    host: redis.options?.socket?.host || 'localhost',
    port: redis.options?.socket?.port || 6379,
  };

  // Create queues
  for (const queueName of Object.keys(queueConfigs)) {
    queues[queueName] = new Queue(queueName, { connection });
  }

  // Create workers
  const workerHandlers: Record<string, (job: any) => Promise<any>> = {
    'vision-identify': processVisionJob,
    'marketplace-research': processMarketplaceJob,
    'pricing-calculate': processPricingJob,
    'jake-voice': processJakeVoiceJob,
    'notifications': processNotificationJob,
  };

  for (const [queueName, config] of Object.entries(queueConfigs)) {
    const worker = new Worker(
      queueName,
      async (job) => {
        logger.info({ queueName, jobId: job.id }, 'Processing job');
        try {
          const result = await workerHandlers[queueName](job);
          logger.info({ queueName, jobId: job.id }, 'Job completed');
          return result;
        } catch (error) {
          logger.error({ queueName, jobId: job.id, error }, 'Job failed');
          throw error;
        }
      },
      {
        connection,
        concurrency: config.concurrency,
        removeOnComplete: { count: 1000 },
        removeOnFail: { count: 5000 },
      }
    );

    worker.on('failed', (job, err) => {
      logger.error({ queueName, jobId: job?.id, error: err }, 'Job failed');
    });

    workers.push(worker);
  }

  logger.info('Queue workers initialized');
}

export function getQueue(name: string): Queue {
  const queue = queues[name];
  if (!queue) {
    throw new Error(`Queue ${name} not found`);
  }
  return queue;
}

export async function addJob(queueName: string, data: any, options?: any) {
  const queue = getQueue(queueName);
  return await queue.add(queueName, data, options);
}

export async function shutdown() {
  await Promise.all(workers.map((w) => w.close()));
  await Promise.all(Object.values(queues).map((q) => q.close()));
  logger.info('Queue workers shut down');
}
