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
    logger.error({ err }, 'Redis error');
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

  // Atomic float increment with TTL (for spending limits, counters, etc.)
  async incrByFloatWithExpiry(key: string, amount: number, ttlSeconds: number): Promise<number> {
    const result = await redisClient.incrByFloat(key, amount);
    const numResult = typeof result === 'string' ? parseFloat(result) : result;
    // Set TTL only on first write (when result equals the amount we just added)
    if (Math.abs(numResult - amount) < 0.001) {
      await redisClient.expire(key, ttlSeconds);
    }
    return numResult;
  },

  // Atomic check-and-increment for spending limits (prevents race conditions)
  async atomicIncrIfUnder(key: string, amount: number, limit: number, ttlSeconds: number): Promise<{ allowed: boolean; newTotal: number }> {
    const lua = `
      local current = tonumber(redis.call('GET', KEYS[1]) or '0')
      local amount = tonumber(ARGV[1])
      local limit = tonumber(ARGV[2])
      local ttl = tonumber(ARGV[3])
      if current + amount > limit then
        return {0, current}
      end
      local newTotal = redis.call('INCRBYFLOAT', KEYS[1], amount)
      if current == 0 then
        redis.call('EXPIRE', KEYS[1], ttl)
      end
      return {1, newTotal}
    `;
    const result = await redisClient.eval(lua, { keys: [key], arguments: [String(amount), String(limit), String(ttlSeconds)] }) as any;
    const arr = Array.isArray(result) ? result : [0, 0];
    return { allowed: Number(arr[0]) === 1, newTotal: Number(arr[1]) };
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
    analytics: 3600, // 1 hour
  },
};
