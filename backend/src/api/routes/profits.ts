/**
 * Profit Analytics API Routes
 *
 * Provides endpoints for seller profit tracking and analytics
 */

import { FastifyInstance } from 'fastify';
import { profitCalculator } from '../../services/profit-calculator.js';
import { logger } from '../../utils/logger.js';

export async function profitRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/profits/summary
   * Get profit summary for a user
   */
  fastify.get('/summary', {
    schema: {
      description: 'Get profit summary for authenticated user',
      tags: ['profits'],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID (temporary - will use JWT auth)' },
        },
        required: ['userId'],
      },
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
    const { userId } = request.query as { userId: string };

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
    schema: {
      description: 'Get profit trends (weekly or monthly)',
      tags: ['profits'],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID' },
          interval: { type: 'string', enum: ['week', 'month'], default: 'week' },
          limit: { type: 'number', default: 12, minimum: 1, maximum: 52 },
        },
        required: ['userId'],
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
    const { userId, interval, limit } = request.query as {
      userId: string;
      interval?: 'week' | 'month';
      limit?: number;
    };

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
    schema: {
      description: 'Get profit breakdown by item category',
      tags: ['profits'],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID' },
        },
        required: ['userId'],
      },
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
    const { userId } = request.query as { userId: string };

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
    schema: {
      description: 'Get estimated profit from pending/active offers',
      tags: ['profits'],
      querystring: {
        type: 'object',
        properties: {
          userId: { type: 'string', description: 'User ID' },
        },
        required: ['userId'],
      },
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
    const { userId } = request.query as { userId: string };

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
   * Record a completed sale (admin/internal use)
   */
  fastify.post('/record-sale', {
    schema: {
      description: 'Record a completed sale with profit calculation',
      tags: ['profits'],
      body: {
        type: 'object',
        properties: {
          offerId: { type: 'string' },
          userId: { type: 'string' },
          soldPrice: { type: 'number' },
          shippingCost: { type: 'number' },
          ebayFees: { type: 'number' },
          platformFees: { type: 'number' },
          salePlatform: { type: 'string' },
          saleReference: { type: 'string' },
        },
        required: ['offerId', 'userId', 'soldPrice'],
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
    const body = request.body as {
      offerId: string;
      userId: string;
      soldPrice: number;
      shippingCost?: number;
      ebayFees?: number;
      platformFees?: number;
      salePlatform?: string;
      saleReference?: string;
    };

    try {
      const { saleId, profit } = await profitCalculator.recordSale(body);

      logger.info({ saleId, offerId: body.offerId, profit }, 'Sale recorded');

      return reply.send({
        saleId,
        profit,
        message: 'Sale recorded successfully',
      });
    } catch (error: any) {
      logger.error({ error: error.message, offerId: body.offerId }, 'Failed to record sale');
      return reply.status(500).send({
        error: 'Failed to record sale',
        message: error.message,
      });
    }
  });
}
