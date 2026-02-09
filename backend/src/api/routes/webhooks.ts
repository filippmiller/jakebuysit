import { FastifyInstance } from 'fastify';

export async function webhooksRoutes(fastify: FastifyInstance) {
  // TODO: Implement webhooks routes
  fastify.get('/', async () => {
    return { message: 'webhooks routes - To be implemented' };
  });
}
