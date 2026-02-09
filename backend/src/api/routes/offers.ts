import { FastifyInstance } from 'fastify';

export async function offersRoutes(fastify: FastifyInstance) {
  // TODO: Implement offers routes
  fastify.get('/', async () => {
    return { message: 'offers routes - To be implemented' };
  });
}
