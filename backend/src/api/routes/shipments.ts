import { FastifyInstance } from 'fastify';

export async function shipmentsRoutes(fastify: FastifyInstance) {
  // TODO: Implement shipments routes
  fastify.get('/', async () => {
    return { message: 'shipments routes - To be implemented' };
  });
}
