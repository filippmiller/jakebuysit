/**
 * Profit Analytics API Routes
 *
 * Provides endpoints for seller profit tracking and analytics
 */

import { FastifyInstance } from 'fastify';
import { profitCalculator } from '../../services/profit-calculator.js';
import { requireAuth } from '../middleware/auth.js';
import { cache } from '../../db/redis.js';
import { db } from '../../db/client.js';
import { logger } from '../../utils/logger.js';

export async function profitRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/profits/summary
   * Get profit summary for authenticated user
   */
  fastify.get('/summary', {
    preHandler: requireAuth,
    schema: {
      description: 'Get profit summary for authenticated user',
      tags: ['profits'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            totalProfit: { type: 'number' },
            totalSales: { type: 'number' },
            avgProfitPerSale: { type: 'number' },
            avgProfitMargin: { type: 'number' },
            currentMonthProfit: { type: 'number' },
            currentMonthSales: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request as any).userId;

    // Rate limit: 10 requests per minute per user
    const rateKey = cache.keys.rateLimitUser(userId, 'profit-1m');
    const count = await cache.incrementWithExpiry(rateKey, 60);
    if (count > 10) {
      return reply.status(429).send({ error: 'Too many requests. Wait a minute, partner.' });
    }

    try {
      const summary = await profitCalculator.getProfitSummary(userId);

      logger.info({ userId, summary }, 'Profit summary retrieved');

      return reply.send(summary);
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Failed to get profit summary');
      return reply.status(500).send({
        error: 'Failed to retrieve profit summary',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/v1/profits/trends
   * Get profit trends over time
   */
  fastify.get('/trends', {
    preHandler: requireAuth,
    schema: {
      description: 'Get profit trends (weekly or monthly)',
      tags: ['profits'],
      security: [{ bearerAuth: [] }],
      querystring: {
        type: 'object',
        properties: {
          interval: { type: 'string', enum: ['week', 'month'], default: 'week' },
          limit: { type: 'number', default: 12, minimum: 1, maximum: 52 },
        },
      },
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              period: { type: 'string' },
              profit: { type: 'number' },
              sales: { type: 'number' },
              avgProfit: { type: 'number' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const { interval, limit } = request.query as {
      interval?: 'week' | 'month';
      limit?: number;
    };

    // Rate limit: 10 requests per minute per user
    const rateKey = cache.keys.rateLimitUser(userId, 'profit-1m');
    const count = await cache.incrementWithExpiry(rateKey, 60);
    if (count > 10) {
      return reply.status(429).send({ error: 'Too many requests. Wait a minute, partner.' });
    }

    try {
      const trends = await profitCalculator.getProfitTrends(
        userId,
        interval || 'week',
        limit || 12
      );

      logger.info({ userId, interval, limit, trendCount: trends.length }, 'Profit trends retrieved');

      return reply.send(trends);
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Failed to get profit trends');
      return reply.status(500).send({
        error: 'Failed to retrieve profit trends',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/v1/profits/by-category
   * Get profit breakdown by category
   */
  fastify.get('/by-category', {
    preHandler: requireAuth,
    schema: {
      description: 'Get profit breakdown by item category',
      tags: ['profits'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              category: { type: 'string' },
              profit: { type: 'number' },
              sales: { type: 'number' },
              avgProfit: { type: 'number' },
              profitMargin: { type: 'number' },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request as any).userId;

    // Rate limit: 10 requests per minute per user
    const rateKey = cache.keys.rateLimitUser(userId, 'profit-1m');
    const count = await cache.incrementWithExpiry(rateKey, 60);
    if (count > 10) {
      return reply.status(429).send({ error: 'Too many requests. Wait a minute, partner.' });
    }

    try {
      const categoryProfits = await profitCalculator.getProfitByCategory(userId);

      logger.info({ userId, categoryCount: categoryProfits.length }, 'Category profits retrieved');

      return reply.send(categoryProfits);
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Failed to get category profits');
      return reply.status(500).send({
        error: 'Failed to retrieve category profits',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/v1/profits/projections
   * Get profit projections from pending offers
   */
  fastify.get('/projections', {
    preHandler: requireAuth,
    schema: {
      description: 'Get estimated profit from pending/active offers',
      tags: ['profits'],
      security: [{ bearerAuth: [] }],
      response: {
        200: {
          type: 'object',
          properties: {
            pendingOffers: { type: 'number' },
            estimatedRevenue: { type: 'number' },
            estimatedCosts: { type: 'number' },
            estimatedProfit: { type: 'number' },
            ifAllAcceptedProfit: { type: 'number' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request as any).userId;

    // Rate limit: 10 requests per minute per user
    const rateKey = cache.keys.rateLimitUser(userId, 'profit-1m');
    const count = await cache.incrementWithExpiry(rateKey, 60);
    if (count > 10) {
      return reply.status(429).send({ error: 'Too many requests. Wait a minute, partner.' });
    }

    try {
      const projections = await profitCalculator.getProfitProjections(userId);

      logger.info({ userId, projections }, 'Profit projections retrieved');

      return reply.send(projections);
    } catch (error: any) {
      logger.error({ error: error.message, userId }, 'Failed to get profit projections');
      return reply.status(500).send({
        error: 'Failed to retrieve profit projections',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/v1/profits/record-sale
   * Record a completed sale (authenticated users only - records sale for their own offer)
   */
  fastify.post('/record-sale', {
    preHandler: requireAuth,
    schema: {
      description: 'Record a completed sale with profit calculation',
      tags: ['profits'],
      security: [{ bearerAuth: [] }],
      body: {
        type: 'object',
        properties: {
          offerId: { type: 'string' },
          soldPrice: { type: 'number' },
          shippingCost: { type: 'number' },
          ebayFees: { type: 'number' },
          platformFees: { type: 'number' },
          salePlatform: { type: 'string' },
          saleReference: { type: 'string' },
        },
        required: ['offerId', 'soldPrice'],
      },
      response: {
        200: {
          type: 'object',
          properties: {
            saleId: { type: 'string' },
            profit: { type: 'number' },
            message: { type: 'string' },
          },
        },
      },
    },
  }, async (request, reply) => {
    const userId = (request as any).userId;
    const body = request.body as {
      offerId: string;
      soldPrice: number;
      shippingCost?: number;
      ebayFees?: number;
      platformFees?: number;
      salePlatform?: string;
      saleReference?: string;
    };

    // Rate limit: 10 requests per minute per user
    const rateKey = cache.keys.rateLimitUser(userId, 'profit-1m');
    const count = await cache.incrementWithExpiry(rateKey, 60);
    if (count > 10) {
      return reply.status(429).send({ error: 'Too many requests. Wait a minute, partner.' });
    }

    // Verify offer ownership
    const offer = await db.findOne('offers', { id: body.offerId });
    if (!offer) {
      return reply.status(404).send({ error: 'Offer not found' });
    }
    if (offer.user_id !== userId) {
      return reply.status(403).send({ error: 'You can only record sales for your own offers, partner.' });
    }

    try {
      const { saleId, profit } = await profitCalculator.recordSale({
        ...body,
        userId,
      });

      logger.info({ saleId, offerId: body.offerId, userId, profit }, 'Sale recorded');

      return reply.send({
        saleId,
        profit,
        message: 'Sale recorded successfully',
      });
    } catch (error: any) {
      logger.error({ error: error.message, offerId: body.offerId, userId }, 'Failed to record sale');
      return reply.status(500).send({
        error: 'Failed to record sale',
        message: error.message,
      });
    }
  });
}
