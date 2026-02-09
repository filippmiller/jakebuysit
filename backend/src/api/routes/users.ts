import { FastifyInstance } from 'fastify';

export async function usersRoutes(fastify: FastifyInstance) {
  // TODO: Implement users routes
  fastify.get('/', async () => {
    return { message: 'users routes - To be implemented' };
  });
}
