import { FastifyInstance } from 'fastify';

export async function authRoutes(fastify: FastifyInstance) {
  // TODO: Implement auth routes
  fastify.get('/', async () => {
    return { message: 'auth routes - To be implemented' };
  });
}
