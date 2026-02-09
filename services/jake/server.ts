/**
 * Agent 3 - Jake Voice & Character System
 * HTTP Server
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import { registerAgent4Routes } from './api/agent4-integration.js';

const PORT = parseInt(process.env.JAKE_PORT || '3002', 10);
const HOST = process.env.JAKE_HOST || 'localhost';

async function startServer() {
  const fastify = Fastify({
    logger: {
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          translateTime: 'HH:MM:ss Z',
          ignore: 'pid,hostname',
        },
      },
    },
  });

  // CORS for Agent 4 integration
  await fastify.register(cors, {
    origin: true,
  });

  // Register Agent 4 integration routes
  await registerAgent4Routes(fastify);

  // Start server
  try {
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Agent 3 (Jake) listening on http://${HOST}:${PORT}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }

  // Graceful shutdown
  process.on('SIGINT', async () => {
    fastify.log.info('Shutting down gracefully...');
    await fastify.close();
    process.exit(0);
  });
}

startServer();
