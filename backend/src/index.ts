import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { db } from './db/client.js';
import { setupRedis, getRedis } from './db/redis.js';
import { setupQueues, shutdown as shutdownQueues } from './queue/workers.js';
import { authRoutes } from './api/routes/auth.js';
import { offerRoutes } from './api/routes/offers.js';
import { usersRoutes } from './api/routes/users.js';
import { shipmentsRoutes } from './api/routes/shipments.js';
import { webhooksRoutes } from './api/routes/webhooks.js';
import { adminRoutes } from './api/routes/admin.js';
import { uploadRoutes } from './api/routes/uploads.js';
import { offerStreamRoutes } from './api/routes/offer-stream.js';
import { logger } from './utils/logger.js';

const fastify = Fastify({
  logger: true,
  bodyLimit: 10485760, // 10MB for photo uploads
});

// Plugins
await fastify.register(cors, {
  origin: process.env.NODE_ENV === 'production'
    ? ['https://jakebuysit.com', 'https://admin.jakebuysit.com']
    : true,
});

await fastify.register(multipart, {
  limits: {
    fileSize: 10485760, // 10MB
    files: 6, // max 6 photos per request
  },
});

await fastify.register(jwt, {
  secret: config.jwt.secret,
  sign: {
    expiresIn: config.jwt.expiresIn,
  },
});

await fastify.register(websocket);

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

// Health check — verifies DB and Redis connectivity
fastify.get('/health', async (_request, reply) => {
  const checks: Record<string, string> = {};

  try {
    await db.query('SELECT 1');
    checks.database = 'connected';
  } catch {
    checks.database = 'disconnected';
  }

  try {
    const redis = getRedis();
    await redis.ping();
    checks.redis = 'connected';
  } catch {
    checks.redis = 'disconnected';
  }

  const healthy = Object.values(checks).every((v) => v === 'connected');

  return reply.status(healthy ? 200 : 503).send({
    status: healthy ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks,
  });
});

// Routes
fastify.register(authRoutes, { prefix: '/api/v1/auth' });
fastify.register(offerRoutes, { prefix: '/api/v1/offers' });
fastify.register(offerStreamRoutes, { prefix: '/api/v1/offers' });
fastify.register(usersRoutes, { prefix: '/api/v1/users' });
fastify.register(shipmentsRoutes, { prefix: '/api/v1/shipments' });
fastify.register(webhooksRoutes, { prefix: '/webhooks' });
fastify.register(adminRoutes, { prefix: '/api/v1/admin' });
fastify.register(uploadRoutes, { prefix: '/api/v1/uploads' });

// Error handler
fastify.setErrorHandler((error: any, request, reply) => {
  logger.error({
    err: error,
    req: { method: request.method, url: request.url },
  });

  const statusCode = error.statusCode || 500;

  // Only expose error messages for client errors (4xx).
  // For server errors (5xx), return a generic message to avoid leaking internals.
  const message = statusCode < 500
    ? (error.message || 'Bad Request')
    : 'Internal Server Error';

  reply.status(statusCode).send({
    error: message,
    statusCode,
  });
});

// Startup
async function start() {
  try {
    // Initialize database
    await db.connect();
    logger.info('Database connected');

    // Initialize Redis
    await setupRedis();
    logger.info('Redis connected');

    // Initialize BullMQ workers
    await setupQueues();
    logger.info('Queue workers started');

    // Start server
    await fastify.listen({
      port: config.server.port,
      host: '0.0.0.0',
    });

    logger.info(`Server listening on 0.0.0.0:${config.server.port}`);

    // Expire stale offers every 15 minutes
    setInterval(async () => {
      try {
        const result = await db.query(
          `UPDATE offers SET status = 'expired'
           WHERE status = 'ready' AND expires_at < NOW()
           RETURNING id`,
        );
        if (result.rowCount && result.rowCount > 0) {
          logger.info({ count: result.rowCount }, 'Expired stale offers');
        }
      } catch (err) {
        logger.error({ err }, 'Offer expiry check failed');
      }
    }, 15 * 60 * 1000);

  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
async function gracefulShutdown() {
  logger.info('Shutting down gracefully...');
  await fastify.close();
  await shutdownQueues();
  await db.disconnect();
  process.exit(0);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

start();
