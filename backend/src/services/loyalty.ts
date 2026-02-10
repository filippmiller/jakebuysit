/**
 * Frontier Club Loyalty System Service
 *
 * Implements 3-tier loyalty system:
 * - Prospector (default): 1x Jake Bucks
 * - Wrangler (10 items sold): 1.5x Jake Bucks
 * - Sheriff (50 items OR $5,000 total): 2x Jake Bucks
 *
 * Jake Bucks economy with redemption catalog and inflation controls.
 */

import { db, TransactionContext } from '../db/client.js';
import { cache } from '../db/redis.js';
import { logger } from '../utils/logger.js';

// Tier definitions
export type LoyaltyTier = 'prospector' | 'wrangler' | 'sheriff';

export interface TierConfig {
  min_items_sold: number;
  min_sales_value: number;
  earn_multiplier: number;
  benefits: string[];
  badge_color: string;
}

export interface TierProgress {
  currentTier: LoyaltyTier;
  nextTier: LoyaltyTier | null;
  itemsSold: number;
  salesValue: number;
  itemsToNextTier: number | null;
  salesValueToNextTier: number | null;
  progressPercentage: number;
  earnMultiplier: number;
  benefits: string[];
}

export interface JakeBucksBalance {
  balance: number;
  recentTransactions: Array<{
    id: string;
    type: string;
    amount: number;
    balance_after: number;
    description: string;
    created_at: Date;
  }>;
}

export interface RedemptionItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  value_usd: number;
  type: string;
  tier_requirement: LoyaltyTier | null;
  available: boolean;
  user_redemption_count?: number;
  max_redemptions_per_user?: number;
}

export interface EconomicHealth {
  total_bucks_in_circulation: number;
  total_bucks_earned_30d: number;
  total_bucks_redeemed_30d: number;
  earn_burn_ratio: number;
  inflation_rate: number;
  total_users_by_tier: Record<LoyaltyTier, number>;
  avg_balance_by_tier: Record<LoyaltyTier, number>;
}

// Cache keys
const TIER_CONFIG_CACHE_KEY = 'loyalty:tier_config';
const JAKE_BUCKS_RULES_CACHE_KEY = 'loyalty:jake_bucks_rules';
const REDEMPTION_CATALOG_CACHE_KEY = 'loyalty:redemption_catalog';

class LoyaltyService {
  private tierConfig: Record<LoyaltyTier, TierConfig> | null = null;
  private jakeBucksRules: any | null = null;

  /**
   * Load tier configuration from database (cached)
   */
  async getTierConfig(): Promise<Record<LoyaltyTier, TierConfig>> {
    if (this.tierConfig) return this.tierConfig;

    const cached = await cache.get(TIER_CONFIG_CACHE_KEY);
    if (cached) {
      this.tierConfig = JSON.parse(cached);
      return this.tierConfig!;
    }

    const result = await db.query(
      "SELECT value FROM config WHERE key = 'loyalty_tiers'"
    );

    if (!result.rows[0]) {
      throw new Error('Loyalty tier configuration not found in database');
    }

    this.tierConfig = result.rows[0].value as Record<LoyaltyTier, TierConfig>;
    await cache.set(TIER_CONFIG_CACHE_KEY, JSON.stringify(this.tierConfig), 3600);

    return this.tierConfig;
  }

  /**
   * Load Jake Bucks rules from database (cached)
   */
  async getJakeBucksRules(): Promise<any> {
    if (this.jakeBucksRules) return this.jakeBucksRules;

    const cached = await cache.get(JAKE_BUCKS_RULES_CACHE_KEY);
    if (cached) {
      this.jakeBucksRules = JSON.parse(cached);
      return this.jakeBucksRules;
    }

    const result = await db.query(
      "SELECT value FROM config WHERE key = 'jake_bucks_rules'"
    );

    if (!result.rows[0]) {
      throw new Error('Jake Bucks rules not found in database');
    }

    this.jakeBucksRules = result.rows[0].value;
    await cache.set(JAKE_BUCKS_RULES_CACHE_KEY, JSON.stringify(this.jakeBucksRules), 3600);

    return this.jakeBucksRules;
  }

  /**
   * Calculate which tier a user should be in based on their stats
   */
  async calculateTier(itemsSold: number, salesValue: number): Promise<LoyaltyTier> {
    const config = await this.getTierConfig();

    // Sheriff: 50 items sold OR $5,000 total
    if (
      itemsSold >= config.sheriff.min_items_sold ||
      salesValue >= config.sheriff.min_sales_value
    ) {
      return 'sheriff';
    }

    // Wrangler: 10 items sold
    if (itemsSold >= config.wrangler.min_items_sold) {
      return 'wrangler';
    }

    // Default: Prospector
    return 'prospector';
  }

  /**
   * Update user's tier based on current stats
   * Returns true if tier changed, false otherwise
   */
  async updateUserTier(userId: string): Promise<{ tierChanged: boolean; newTier: LoyaltyTier }> {
    const user = await db.findOne<any>('users', { id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    const currentTier = user.loyalty_tier as LoyaltyTier;
    const newTier = await this.calculateTier(user.total_items_sold || 0, parseFloat(user.total_sales_value || '0'));

    if (currentTier === newTier) {
      return { tierChanged: false, newTier: currentTier };
    }

    // Update tier in database
    await db.update('users', { id: userId }, { loyalty_tier: newTier });

    // Log tier transition
    await db.create('loyalty_tier_transitions', {
      user_id: userId,
      from_tier: currentTier,
      to_tier: newTier,
      triggered_by: user.total_items_sold >= 50 || parseFloat(user.total_sales_value || '0') >= 5000
        ? 'items_sold'
        : 'sales_value',
      items_sold_at_transition: user.total_items_sold || 0,
      sales_value_at_transition: parseFloat(user.total_sales_value || '0'),
    });

    logger.info({ userId, from: currentTier, to: newTier }, 'User tier upgraded');

    return { tierChanged: true, newTier };
  }

  /**
   * Get earn rate multiplier for a user's current tier
   */
  async getEarnRate(userId: string): Promise<number> {
    const user = await db.findOne<any>('users', { id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    const config = await this.getTierConfig();
    const tier = user.loyalty_tier as LoyaltyTier || 'prospector';

    return config[tier].earn_multiplier;
  }

  /**
   * Award Jake Bucks to a user
   * Respects daily cap and tier multipliers
   */
  async awardJakeBucks(
    userId: string,
    baseAmount: number,
    reason: string,
    referenceType?: string,
    referenceId?: string
  ): Promise<{ awarded: number; balance: number; cappedByLimit: boolean }> {
    const rules = await this.getJakeBucksRules();

    // Check daily cap
    const today = new Date().toISOString().split('T')[0];
    const dailyKey = `loyalty:daily_earned:${userId}:${today}`;
    const earnedToday = parseInt(await cache.get(dailyKey) || '0', 10);

    if (earnedToday >= rules.daily_earn_cap) {
      logger.warn({ userId, earnedToday }, 'User hit daily Jake Bucks cap');
      return { awarded: 0, balance: 0, cappedByLimit: true };
    }

    // Apply tier multiplier
    const multiplier = await this.getEarnRate(userId);
    const actualAmount = Math.floor(baseAmount * multiplier);

    // Cap at daily limit
    const remaining = rules.daily_earn_cap - earnedToday;
    const finalAmount = Math.min(actualAmount, remaining);

    // Update balance in transaction
    const result = await db.transaction(async (trx: TransactionContext) => {
      const user = await trx.findOne<any>('users', { id: userId });
      if (!user) {
        throw new Error('User not found');
      }

      const currentBalance = parseFloat(user.jake_bucks_balance || '0');
      const newBalance = currentBalance + finalAmount;

      await trx.update('users', { id: userId }, { jake_bucks_balance: newBalance });

      await trx.create('jake_bucks_transactions', {
        user_id: userId,
        type: 'earned',
        amount: finalAmount,
        balance_after: newBalance,
        reference_type: referenceType || 'manual',
        reference_id: referenceId || null,
        description: reason,
      });

      return { balance: newBalance };
    });

    // Update daily counter
    await cache.incrementWithExpiry(dailyKey, 86400);

    logger.info({ userId, amount: finalAmount, reason }, 'Jake Bucks awarded');

    return { awarded: finalAmount, balance: result.balance, cappedByLimit: finalAmount < actualAmount };
  }

  /**
   * Deduct Jake Bucks from user (for redemptions)
   */
  async deductJakeBucks(
    userId: string,
    amount: number,
    reason: string,
    referenceType?: string,
    referenceId?: string
  ): Promise<{ success: boolean; balance: number; error?: string }> {
    const result = await db.transaction(async (trx: TransactionContext) => {
      const user = await trx.findOne<any>('users', { id: userId });
      if (!user) {
        throw new Error('User not found');
      }

      const currentBalance = parseFloat(user.jake_bucks_balance || '0');

      if (currentBalance < amount) {
        return { success: false, balance: currentBalance, error: 'Insufficient Jake Bucks' };
      }

      const newBalance = currentBalance - amount;

      await trx.update('users', { id: userId }, { jake_bucks_balance: newBalance });

      await trx.create('jake_bucks_transactions', {
        user_id: userId,
        type: 'redeemed',
        amount: -amount,
        balance_after: newBalance,
        reference_type: referenceType || 'manual',
        reference_id: referenceId || null,
        description: reason,
      });

      return { success: true, balance: newBalance };
    });

    if (result.success) {
      logger.info({ userId, amount, reason }, 'Jake Bucks deducted');
    }

    return result;
  }

  /**
   * Get user's tier progress toward next tier
   */
  async checkTierProgress(userId: string): Promise<TierProgress> {
    const user = await db.findOne<any>('users', { id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    const config = await this.getTierConfig();
    const currentTier = (user.loyalty_tier as LoyaltyTier) || 'prospector';
    const itemsSold = user.total_items_sold || 0;
    const salesValue = parseFloat(user.total_sales_value || '0');

    let nextTier: LoyaltyTier | null = null;
    let itemsToNextTier: number | null = null;
    let salesValueToNextTier: number | null = null;
    let progressPercentage = 100;

    if (currentTier === 'prospector') {
      nextTier = 'wrangler';
      itemsToNextTier = Math.max(0, config.wrangler.min_items_sold - itemsSold);
      progressPercentage = Math.min(100, (itemsSold / config.wrangler.min_items_sold) * 100);
    } else if (currentTier === 'wrangler') {
      nextTier = 'sheriff';
      itemsToNextTier = Math.max(0, config.sheriff.min_items_sold - itemsSold);
      salesValueToNextTier = Math.max(0, config.sheriff.min_sales_value - salesValue);

      // Progress is based on whichever is closer (items OR sales value)
      const itemsProgress = (itemsSold / config.sheriff.min_items_sold) * 100;
      const salesProgress = (salesValue / config.sheriff.min_sales_value) * 100;
      progressPercentage = Math.min(100, Math.max(itemsProgress, salesProgress));
    }

    return {
      currentTier,
      nextTier,
      itemsSold,
      salesValue,
      itemsToNextTier,
      salesValueToNextTier,
      progressPercentage,
      earnMultiplier: config[currentTier].earn_multiplier,
      benefits: config[currentTier].benefits,
    };
  }

  /**
   * Get user's Jake Bucks balance and recent transactions
   */
  async getJakeBucksBalance(userId: string, limit: number = 10): Promise<JakeBucksBalance> {
    const user = await db.findOne<any>('users', { id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    const transactions = await db.query<any>(
      `SELECT * FROM jake_bucks_transactions
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [userId, limit]
    );

    return {
      balance: parseFloat(user.jake_bucks_balance || '0'),
      recentTransactions: transactions.rows.map(row => ({
        id: row.id,
        type: row.type,
        amount: parseFloat(row.amount),
        balance_after: parseFloat(row.balance_after),
        description: row.description,
        created_at: row.created_at,
      })),
    };
  }

  /**
   * Get redemption catalog with user-specific availability
   */
  async getRedemptionCatalog(userId: string): Promise<RedemptionItem[]> {
    const user = await db.findOne<any>('users', { id: userId });
    if (!user) {
      throw new Error('User not found');
    }

    const userTier = (user.loyalty_tier as LoyaltyTier) || 'prospector';
    const tierHierarchy: Record<LoyaltyTier, number> = {
      prospector: 0,
      wrangler: 1,
      sheriff: 2,
    };

    const catalog = await db.query<any>(
      `SELECT * FROM loyalty_redemptions WHERE active = true ORDER BY cost ASC`
    );

    // Get user redemption counts
    const redemptionCounts = await db.query<any>(
      `SELECT redemption_id, COUNT(*) as count
       FROM loyalty_redemption_history
       WHERE user_id = $1 AND status = 'completed'
       GROUP BY redemption_id`,
      [userId]
    );

    const countsMap = new Map(
      redemptionCounts.rows.map(row => [row.redemption_id, parseInt(row.count, 10)])
    );

    return catalog.rows.map(row => {
      const tierReq = row.tier_requirement as LoyaltyTier | null;
      const available = !tierReq || tierHierarchy[userTier] >= tierHierarchy[tierReq];

      const userCount = countsMap.get(row.id) || 0;
      const maxRedemptions = row.max_redemptions_per_user;
      const canRedeem = !maxRedemptions || userCount < maxRedemptions;

      return {
        id: row.id,
        name: row.name,
        description: row.description,
        cost: row.cost,
        value_usd: parseFloat(row.value_usd),
        type: row.type,
        tier_requirement: tierReq,
        available: available && canRedeem,
        user_redemption_count: userCount,
        max_redemptions_per_user: maxRedemptions,
      };
    });
  }

  /**
   * Redeem Jake Bucks for an item
   */
  async redeemBucks(
    userId: string,
    redemptionId: string
  ): Promise<{ success: boolean; error?: string; metadata?: any }> {
    const user = await db.findOne<any>('users', { id: userId });
    if (!user) {
      return { success: false, error: 'User not found' };
    }

    const redemption = await db.findOne<any>('loyalty_redemptions', { id: redemptionId, active: true });
    if (!redemption) {
      return { success: false, error: 'Redemption item not found' };
    }

    // Check tier requirement
    const userTier = (user.loyalty_tier as LoyaltyTier) || 'prospector';
    const tierHierarchy: Record<LoyaltyTier, number> = {
      prospector: 0,
      wrangler: 1,
      sheriff: 2,
    };

    if (redemption.tier_requirement) {
      const reqTier = redemption.tier_requirement as LoyaltyTier;
      if (tierHierarchy[userTier] < tierHierarchy[reqTier]) {
        return { success: false, error: `This redemption requires ${reqTier} tier or higher` };
      }
    }

    // Check max redemptions
    if (redemption.max_redemptions_per_user) {
      const count = await db.query<any>(
        `SELECT COUNT(*) as count FROM loyalty_redemption_history
         WHERE user_id = $1 AND redemption_id = $2 AND status = 'completed'`,
        [userId, redemptionId]
      );
      const userCount = parseInt(count.rows[0].count, 10);
      if (userCount >= redemption.max_redemptions_per_user) {
        return { success: false, error: 'Maximum redemptions reached for this item' };
      }
    }

    // Deduct Jake Bucks
    const deductResult = await this.deductJakeBucks(
      userId,
      redemption.cost,
      `Redeemed: ${redemption.name}`,
      'redemption',
      redemptionId
    );

    if (!deductResult.success) {
      return { success: false, error: deductResult.error };
    }

    // Create redemption history entry
    await db.create('loyalty_redemption_history', {
      user_id: userId,
      redemption_id: redemptionId,
      cost: redemption.cost,
      status: 'completed',
      metadata: {
        redemption_name: redemption.name,
        value_usd: redemption.value_usd,
      },
    });

    logger.info({ userId, redemptionId, cost: redemption.cost }, 'Jake Bucks redeemed');

    return { success: true, metadata: { redemption_name: redemption.name } };
  }

  /**
   * Get economic health metrics for admin dashboard
   */
  async getEconomicHealth(): Promise<EconomicHealth> {
    const [circulation, earned30d, redeemed30d, tierCounts, tierBalances] = await Promise.all([
      // Total Jake Bucks in circulation
      db.query<any>('SELECT SUM(jake_bucks_balance) as total FROM users'),

      // Total earned in last 30 days
      db.query<any>(
        `SELECT SUM(amount) as total FROM jake_bucks_transactions
         WHERE type = 'earned' AND created_at >= NOW() - INTERVAL '30 days'`
      ),

      // Total redeemed in last 30 days
      db.query<any>(
        `SELECT SUM(ABS(amount)) as total FROM jake_bucks_transactions
         WHERE type = 'redeemed' AND created_at >= NOW() - INTERVAL '30 days'`
      ),

      // User counts by tier
      db.query<any>(
        `SELECT loyalty_tier, COUNT(*) as count FROM users
         GROUP BY loyalty_tier`
      ),

      // Average balance by tier
      db.query<any>(
        `SELECT loyalty_tier, AVG(jake_bucks_balance) as avg_balance FROM users
         GROUP BY loyalty_tier`
      ),
    ]);

    const totalCirculation = parseFloat(circulation.rows[0]?.total || '0');
    const totalEarned = parseFloat(earned30d.rows[0]?.total || '0');
    const totalRedeemed = parseFloat(redeemed30d.rows[0]?.total || '0');

    const earnBurnRatio = totalRedeemed > 0 ? totalEarned / totalRedeemed : totalEarned;
    const inflationRate = earnBurnRatio - 1;

    const tierCountsMap: Record<LoyaltyTier, number> = {
      prospector: 0,
      wrangler: 0,
      sheriff: 0,
    };
    tierCounts.rows.forEach(row => {
      tierCountsMap[row.loyalty_tier as LoyaltyTier] = parseInt(row.count, 10);
    });

    const tierBalancesMap: Record<LoyaltyTier, number> = {
      prospector: 0,
      wrangler: 0,
      sheriff: 0,
    };
    tierBalances.rows.forEach(row => {
      tierBalancesMap[row.loyalty_tier as LoyaltyTier] = parseFloat(row.avg_balance || '0');
    });

    return {
      total_bucks_in_circulation: totalCirculation,
      total_bucks_earned_30d: totalEarned,
      total_bucks_redeemed_30d: totalRedeemed,
      earn_burn_ratio: earnBurnRatio,
      inflation_rate: inflationRate,
      total_users_by_tier: tierCountsMap,
      avg_balance_by_tier: tierBalancesMap,
    };
  }
}

export const loyaltyService = new LoyaltyService();
