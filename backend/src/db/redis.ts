import { createClient } from 'redis';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

export type RedisClient = ReturnType<typeof createClient>;

let redisClient: RedisClient;

export async function setupRedis(): Promise<RedisClient> {
  redisClient = createClient({
    url: config.redis.url,
  });

  redisClient.on('error', (err) => {
    logger.error('Redis error', err);
  });

  redisClient.on('connect', () => {
    logger.info('Redis connected');
  });

  await redisClient.connect();

  return redisClient;
}

export function getRedis(): RedisClient {
  if (!redisClient) {
    throw new Error('Redis not initialized. Call setupRedis() first.');
  }
  return redisClient;
}

// Cache utilities
export const cache = {
  async get<T>(key: string): Promise<T | null> {
    const value = await redisClient.get(key);
    return value ? JSON.parse(value) : null;
  },

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    const serialized = JSON.stringify(value);
    if (ttlSeconds) {
      await redisClient.setEx(key, ttlSeconds, serialized);
    } else {
      await redisClient.set(key, serialized);
    }
  },

  async del(key: string): Promise<void> {
    await redisClient.del(key);
  },

  async exists(key: string): Promise<boolean> {
    return (await redisClient.exists(key)) === 1;
  },

  // Rate limiting
  async incrementWithExpiry(key: string, ttlSeconds: number): Promise<number> {
    const count = await redisClient.incr(key);
    if (count === 1) {
      await redisClient.expire(key, ttlSeconds);
    }
    return count;
  },

  // Pattern helpers
  keys: {
    user: (id: string) => `user:${id}`,
    offer: (id: string) => `offer:${id}`,
    marketplace: (hash: string) => `market:${hash}`,
    config: 'config:all',
    rateLimitUser: (userId: string, window: string) => `rate:user:${userId}:${window}`,
    rateLimitIP: (ip: string, window: string) => `rate:ip:${ip}:${window}`,
  },

  ttl: {
    user: 300, // 5 minutes
    offer: 120, // 2 minutes
    marketplace: 21600, // 6 hours
    config: 3600, // 1 hour
  },
};
