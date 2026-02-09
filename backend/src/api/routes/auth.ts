/**
 * Authentication routes — register, login, refresh token.
 */
import { FastifyInstance } from 'fastify';
import { db } from '../../db/client.js';
import { cache } from '../../db/redis.js';
import { logger } from '../../utils/logger.js';
import { registerSchema, loginSchema, refreshSchema, validateBody } from '../schemas.js';
import crypto from 'node:crypto';

export async function authRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/auth/register
   * Create a new user account with email + password.
   */
  fastify.post('/register', async (request, reply) => {
    const { email, password, name, phone } = validateBody(registerSchema, request.body);

    // Check if user exists
    const existing = await db.findOne('users', { email: email.toLowerCase() });
    if (existing) {
      return reply.status(409).send({ error: 'Email already registered' });
    }

    // Hash password using pgcrypto (bcrypt via DB)
    const result = await db.query(
      `INSERT INTO users (email, name, phone, auth_provider, password_hash, verified)
       VALUES ($1, $2, $3, 'email', crypt($4, gen_salt('bf', 10)), false)
       RETURNING id, email, name, jake_familiarity, jake_bucks_balance, created_at`,
      [email.toLowerCase(), name || null, phone || null, password],
    );

    const user = result.rows[0];

    // Generate tokens
    const accessToken = fastify.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '15m' },
    );
    const refreshToken = crypto.randomUUID();

    // Store refresh token in Redis (7 day TTL)
    await cache.set(`refresh:${refreshToken}`, { userId: user.id }, 604800);

    logger.info({ userId: user.id, email: user.email }, 'User registered');

    return reply.status(201).send({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        jakeFamiliarity: user.jake_familiarity,
        jakeBucksBalance: parseFloat(user.jake_bucks_balance),
      },
      accessToken,
      refreshToken,
    });
  });

  /**
   * POST /api/v1/auth/login
   * Authenticate with email + password.
   */
  fastify.post('/login', async (request, reply) => {
    const { email, password } = validateBody(loginSchema, request.body);

    // Verify password using pgcrypto bcrypt
    const result = await db.query(
      `SELECT id, email, name, jake_familiarity, jake_bucks_balance, trust_score, payout_preferred
       FROM users
       WHERE email = $1 AND password_hash = crypt($2, password_hash)`,
      [email.toLowerCase(), password],
    );

    if (result.rows.length === 0) {
      return reply.status(401).send({ error: 'Invalid email or password' });
    }

    const user = result.rows[0];

    // Generate tokens
    const accessToken = fastify.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '15m' },
    );
    const refreshToken = crypto.randomUUID();

    await cache.set(`refresh:${refreshToken}`, { userId: user.id }, 604800);

    logger.info({ userId: user.id }, 'User logged in');

    return {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        jakeFamiliarity: user.jake_familiarity,
        jakeBucksBalance: parseFloat(user.jake_bucks_balance),
        trustScore: user.trust_score,
        payoutPreferred: user.payout_preferred,
      },
      accessToken,
      refreshToken,
    };
  });

  /**
   * POST /api/v1/auth/refresh
   * Exchange a refresh token for new access + refresh tokens.
   */
  fastify.post('/refresh', async (request, reply) => {
    const { refreshToken } = validateBody(refreshSchema, request.body);

    // Look up refresh token
    const tokenData = await cache.get<{ userId: string }>(`refresh:${refreshToken}`);
    if (!tokenData) {
      return reply.status(401).send({ error: 'Invalid or expired refresh token' });
    }

    // Rotate: invalidate old, issue new
    await cache.del(`refresh:${refreshToken}`);

    const user = await db.findOne('users', { id: tokenData.userId });
    if (!user) {
      return reply.status(401).send({ error: 'User not found' });
    }

    const newAccessToken = fastify.jwt.sign(
      { sub: user.id, email: user.email },
      { expiresIn: '15m' },
    );
    const newRefreshToken = crypto.randomUUID();

    await cache.set(`refresh:${newRefreshToken}`, { userId: user.id }, 604800);

    return { accessToken: newAccessToken, refreshToken: newRefreshToken };
  });
}
