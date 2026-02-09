import Fastify from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import jwt from '@fastify/jwt';
import websocket from '@fastify/websocket';
import rateLimit from '@fastify/rate-limit';
import { config } from './config.js';
import { db } from './db/client.js';
import { setupRedis } from './db/redis.js';
import { setupQueues } from './queue/workers.js';
import { authRoutes } from './api/routes/auth.js';
import { offerRoutes } from './api/routes/offers.js';
import { usersRoutes } from './api/routes/users.js';
import { shipmentsRoutes } from './api/routes/shipments.js';
import { webhooksRoutes } from './api/routes/webhooks.js';
import { adminRoutes } from './api/routes/admin.js';
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

// Health check
fastify.get('/health', async () => {
  return {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    env: process.env.NODE_ENV,
  };
});

// Routes
fastify.register(authRoutes, { prefix: '/api/v1/auth' });
fastify.register(offerRoutes, { prefix: '/api/v1/offers' });
fastify.register(usersRoutes, { prefix: '/api/v1/users' });
fastify.register(shipmentsRoutes, { prefix: '/api/v1/shipments' });
fastify.register(webhooksRoutes, { prefix: '/webhooks' });
fastify.register(adminRoutes, { prefix: '/api/v1/admin' });

// Error handler
fastify.setErrorHandler((error: any, request, reply) => {
  logger.error({
    err: error,
    req: request,
  });

  reply.status(error.statusCode || 500).send({
    error: error.message || 'Internal Server Error',
    statusCode: error.statusCode || 500,
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
      host: config.server.host,
    });

    logger.info(`Server listening on ${config.server.host}:${config.server.port}`);
  } catch (error) {
    logger.error(error);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  logger.info('Shutting down gracefully...');
  await fastify.close();
  await db.disconnect();
  process.exit(0);
});

start();
