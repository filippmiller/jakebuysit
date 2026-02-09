import { FastifyInstance } from 'fastify';

export async function adminRoutes(fastify: FastifyInstance) {
  // TODO: Implement admin routes
  fastify.get('/', async () => {
    return { message: 'admin routes - To be implemented' };
  });
}
