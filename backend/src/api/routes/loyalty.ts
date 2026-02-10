/**
 * Loyalty API Routes — Frontier Club tiers, Jake Bucks, and redemptions
 *
 * GET    /tier              Get current tier info and progress
 * GET    /bucks             Get Jake Bucks balance and transaction history
 * GET    /progress          Get progress toward next tier
 * GET    /redemptions       Get redemption catalog
 * POST   /redemptions/:id   Redeem Jake Bucks for an item
 */

import { FastifyInstance } from 'fastify';
import { requireAuth } from '../middleware/auth.js';
import { loyaltyService } from '../../services/loyalty.js';
import { db } from '../../db/client.js';
import { logger } from '../../utils/logger.js';
import { z } from 'zod';

// Validation schemas
const redeemSchema = z.object({
  redemptionId: z.string().min(1),
});

export async function loyaltyRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/v1/loyalty/tier
   * Get user's current tier information
   */
  fastify.get('/tier', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId;

    try {
      const progress = await loyaltyService.checkTierProgress(userId);

      return reply.send({
        tier: progress.currentTier,
        nextTier: progress.nextTier,
        earnMultiplier: progress.earnMultiplier,
        benefits: progress.benefits,
        itemsSold: progress.itemsSold,
        salesValue: progress.salesValue,
      });
    } catch (err: any) {
      logger.error({ error: err.message, userId }, 'Failed to get tier info');
      return reply.status(500).send({ error: 'Failed to fetch tier information' });
    }
  });

  /**
   * GET /api/v1/loyalty/progress
   * Get detailed progress toward next tier
   */
  fastify.get('/progress', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId;

    try {
      const progress = await loyaltyService.checkTierProgress(userId);

      return reply.send({
        currentTier: progress.currentTier,
        nextTier: progress.nextTier,
        itemsSold: progress.itemsSold,
        salesValue: progress.salesValue,
        itemsToNextTier: progress.itemsToNextTier,
        salesValueToNextTier: progress.salesValueToNextTier,
        progressPercentage: progress.progressPercentage,
        earnMultiplier: progress.earnMultiplier,
        benefits: progress.benefits,
      });
    } catch (err: any) {
      logger.error({ error: err.message, userId }, 'Failed to get tier progress');
      return reply.status(500).send({ error: 'Failed to fetch tier progress' });
    }
  });

  /**
   * GET /api/v1/loyalty/bucks
   * Get Jake Bucks balance and transaction history
   */
  fastify.get('/bucks', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId;

    try {
      const balanceData = await loyaltyService.getJakeBucksBalance(userId, 20);

      return reply.send({
        balance: balanceData.balance,
        recentTransactions: balanceData.recentTransactions,
      });
    } catch (err: any) {
      logger.error({ error: err.message, userId }, 'Failed to get Jake Bucks balance');
      return reply.status(500).send({ error: 'Failed to fetch Jake Bucks balance' });
    }
  });

  /**
   * GET /api/v1/loyalty/redemptions
   * Get redemption catalog with user-specific availability
   */
  fastify.get('/redemptions', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId;

    try {
      const catalog = await loyaltyService.getRedemptionCatalog(userId);

      return reply.send({
        items: catalog,
      });
    } catch (err: any) {
      logger.error({ error: err.message, userId }, 'Failed to get redemption catalog');
      return reply.status(500).send({ error: 'Failed to fetch redemption catalog' });
    }
  });

  /**
   * POST /api/v1/loyalty/redemptions/:id
   * Redeem Jake Bucks for a specific item
   */
  fastify.post('/redemptions/:id', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId;
    const { id: redemptionId } = request.params as { id: string };

    try {
      const result = await loyaltyService.redeemBucks(userId, redemptionId);

      if (!result.success) {
        return reply.status(400).send({ error: result.error });
      }

      logger.info({ userId, redemptionId }, 'Jake Bucks redemption successful');

      return reply.send({
        success: true,
        message: `You redeemed ${result.metadata?.redemption_name || 'an item'}!`,
      });
    } catch (err: any) {
      logger.error({ error: err.message, userId, redemptionId }, 'Failed to redeem Jake Bucks');
      return reply.status(500).send({ error: 'Failed to process redemption' });
    }
  });

  /**
   * GET /api/v1/loyalty/economic-health (Admin only)
   * Get economic health metrics for admin dashboard
   */
  fastify.get('/economic-health', { preHandler: requireAuth }, async (request, reply) => {
    const userId = (request as any).userId;

    // Check if user is admin
    const user = await db.findOne<any>('users', { id: userId });
    if (!user || !['admin', 'super_admin'].includes(user.role)) {
      return reply.status(403).send({ error: 'Forbidden' });
    }

    try {
      const health = await loyaltyService.getEconomicHealth();

      return reply.send(health);
    } catch (err: any) {
      logger.error({ error: err.message }, 'Failed to get economic health');
      return reply.status(500).send({ error: 'Failed to fetch economic health metrics' });
    }
  });
}
