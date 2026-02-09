/**
 * Admin authentication middleware.
 * Extends requireAuth to also check for admin roles.
 */
import { FastifyRequest, FastifyReply } from 'fastify';
import { db } from '../../db/client.js';
import { logger } from '../../utils/logger.js';

type AdminRole = 'admin' | 'super_admin' | 'reviewer' | 'warehouse';

const ADMIN_ROLES: Set<string> = new Set(['admin', 'super_admin', 'reviewer', 'warehouse']);

/**
 * Require a valid JWT + admin role.
 */
export async function requireAdmin(request: FastifyRequest, reply: FastifyReply): Promise<void> {
  try {
    const decoded = await request.jwtVerify();
    const userId = (decoded as any).sub;
    (request as any).userId = userId;
    (request as any).userEmail = (decoded as any).email;

    const user = await db.findOne('users', { id: userId });
    if (!user || !ADMIN_ROLES.has(user.role)) {
      reply.status(403).send({ error: 'Forbidden: admin access required', statusCode: 403 });
      return;
    }

    if (user.banned) {
      reply.status(403).send({ error: 'Account suspended', statusCode: 403 });
      return;
    }

    (request as any).adminRole = user.role;
    (request as any).adminUser = user;
  } catch (err) {
    logger.warn({ error: (err as Error).message }, 'Admin auth failed');
    reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
  }
}

/**
 * Require a specific admin role (or higher).
 * Role hierarchy: super_admin > admin > reviewer = warehouse
 */
export function requireRole(...roles: AdminRole[]) {
  return async function (request: FastifyRequest, reply: FastifyReply): Promise<void> {
    // First run standard admin auth
    await requireAdmin(request, reply);
    if (reply.sent) return;

    const userRole = (request as any).adminRole as string;

    // super_admin has access to everything
    if (userRole === 'super_admin') return;

    if (!roles.includes(userRole as AdminRole)) {
      reply.status(403).send({ error: `Forbidden: requires one of [${roles.join(', ')}]`, statusCode: 403 });
    }
  };
}
