/**
 * JWT authentication middleware for Fastify routes.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../utils/logger.js';

/**
 * Require a valid JWT token. Decodes and attaches user to request.
 */
export async function requireAuth(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const decoded = await request.jwtVerify();
    (request as any).userId = (decoded as any).sub;
    (request as any).userEmail = (decoded as any).email;
  } catch (err) {
    logger.warn({ error: (err as Error).message }, 'Auth failed');
    reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
  }
}

/**
 * Optional auth — attaches user if token present, but doesn't block.
 * Useful for endpoints that work for both anonymous and authenticated users (e.g., offer creation).
 */
export async function optionalAuth(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    const auth = request.headers.authorization;
    if (auth?.startsWith('Bearer ')) {
      const decoded = await request.jwtVerify();
      (request as any).userId = (decoded as any).sub;
      (request as any).userEmail = (decoded as any).email;
    }
  } catch {
    // Token invalid or missing — proceed as anonymous
    (request as any).userId = null;
  }
}
