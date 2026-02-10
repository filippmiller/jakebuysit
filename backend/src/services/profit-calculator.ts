/**
 * Profit Calculator Service
 *
 * Handles profit calculations for completed sales and projections for pending offers.
 *
 * Profit Formula:
 * Net Profit = Revenue - (Offer Amount + Shipping Cost + Platform Fees)
 * Profit Margin = (Net Profit / Revenue) * 100
 */

import { db } from '../db/client.js';
import { cache } from '../db/redis.js';
import { logger } from '../utils/logger.js';

const PROFIT_CACHE_TTL = 3600; // 1 hour

export interface ProfitCalculation {
  soldPrice: number;
  offerAmount: number;
  shippingCost: number;
  ebayFees: number;
  platformFees: number;
  totalCosts: number;
  profit: number;
  profitMargin: number;
}

export interface ProfitSummary {
  totalProfit: number;
  totalSales: number;
  avgProfitPerSale: number;
  avgProfitMargin: number;
  currentMonthProfit: number;
  currentMonthSales: number;
}

export interface ProfitTrend {
  period: string; // 'YYYY-MM-DD' or 'YYYY-MM'
  profit: number;
  sales: number;
  avgProfit: number;
}

export interface CategoryProfit {
  category: string;
  profit: number;
  sales: number;
  avgProfit: number;
  profitMargin: number;
}

export interface ProfitProjection {
  pendingOffers: number;
  estimatedRevenue: number;
  estimatedCosts: number;
  estimatedProfit: number;
  ifAllAcceptedProfit: number;
}

export const profitCalculator = {
  /**
   * Calculate profit for a completed sale
   */
  calculateProfit(params: {
    soldPrice: number;
    offerAmount: number;
    shippingCost?: number;
    ebayFees?: number;
    platformFees?: number;
  }): ProfitCalculation {
    const shippingCost = params.shippingCost || 0;
    const ebayFees = params.ebayFees || 0;
    const platformFees = params.platformFees || 0;

    const totalCosts = params.offerAmount + shippingCost + ebayFees + platformFees;
    const profit = params.soldPrice - totalCosts;
    const profitMargin = params.soldPrice > 0 ? (profit / params.soldPrice) * 100 : 0;

    return {
      soldPrice: params.soldPrice,
      offerAmount: params.offerAmount,
      shippingCost,
      ebayFees,
      platformFees,
      totalCosts,
      profit,
      profitMargin: parseFloat(profitMargin.toFixed(2)),
    };
  },

  /**
   * Record a completed sale with profit calculation
   */
  async recordSale(params: {
    offerId: string;
    userId: string;
    soldPrice: number;
    shippingCost?: number;
    ebayFees?: number;
    platformFees?: number;
    salePlatform?: string;
    saleReference?: string;
  }): Promise<{ saleId: string; profit: number }> {
    // Get offer to retrieve offer_amount
    const offer = await db.findOne('offers', { id: params.offerId });
    if (!offer) {
      throw new Error(`Offer ${params.offerId} not found`);
    }

    const calculation = this.calculateProfit({
      soldPrice: params.soldPrice,
      offerAmount: offer.offer_amount,
      shippingCost: params.shippingCost,
      ebayFees: params.ebayFees,
      platformFees: params.platformFees,
    });

    // Create sale record
    const sale = await db.create('sales', {
      offer_id: params.offerId,
      user_id: params.userId,
      sold_price: calculation.soldPrice,
      offer_amount: calculation.offerAmount,
      shipping_cost: calculation.shippingCost,
      ebay_fees: calculation.ebayFees,
      platform_fees: calculation.platformFees,
      total_costs: calculation.totalCosts,
      profit: calculation.profit,
      profit_margin: calculation.profitMargin,
      sale_platform: params.salePlatform || 'direct',
      sale_reference: params.saleReference || null,
    });

    // Invalidate user's profit cache
    await cache.del(cache.keys.custom(`profit:summary:${params.userId}`));
    await cache.del(cache.keys.custom(`profit:trends:${params.userId}:*`));
    await cache.del(cache.keys.custom(`profit:categories:${params.userId}`));

    logger.info(
      { saleId: sale.id, offerId: params.offerId, profit: calculation.profit },
      'Sale recorded with profit calculation'
    );

    return { saleId: sale.id, profit: calculation.profit };
  },

  /**
   * Get profit summary for a user
   */
  async getProfitSummary(userId: string): Promise<ProfitSummary> {
    const cacheKey = cache.keys.custom(`profit:summary:${userId}`);

    // Try cache first
    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Query sales data
    const result = await db.query(
      `SELECT
        COUNT(*) as total_sales,
        COALESCE(SUM(profit), 0) as total_profit,
        COALESCE(AVG(profit), 0) as avg_profit_per_sale,
        COALESCE(AVG(profit_margin), 0) as avg_profit_margin,
        COALESCE(SUM(CASE WHEN DATE_TRUNC('month', sold_at) = DATE_TRUNC('month', NOW()) THEN profit ELSE 0 END), 0) as current_month_profit,
        COUNT(CASE WHEN DATE_TRUNC('month', sold_at) = DATE_TRUNC('month', NOW()) THEN 1 END) as current_month_sales
      FROM sales
      WHERE user_id = $1`,
      [userId]
    );

    const row = result.rows[0];
    const summary: ProfitSummary = {
      totalProfit: parseFloat(row.total_profit),
      totalSales: parseInt(row.total_sales),
      avgProfitPerSale: parseFloat(row.avg_profit_per_sale || 0),
      avgProfitMargin: parseFloat(row.avg_profit_margin || 0),
      currentMonthProfit: parseFloat(row.current_month_profit),
      currentMonthSales: parseInt(row.current_month_sales),
    };

    // Cache for 1 hour
    await cache.set(cacheKey, summary, PROFIT_CACHE_TTL);

    return summary;
  },

  /**
   * Get profit trends over time (weekly or monthly)
   */
  async getProfitTrends(userId: string, interval: 'week' | 'month' = 'week', limit: number = 12): Promise<ProfitTrend[]> {
    const cacheKey = cache.keys.custom(`profit:trends:${userId}:${interval}:${limit}`);

    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const truncFunction = interval === 'week' ? 'week' : 'month';

    const result = await db.query(
      `SELECT
        DATE_TRUNC('${truncFunction}', sold_at)::date as period,
        SUM(profit) as profit,
        COUNT(*) as sales,
        AVG(profit) as avg_profit
      FROM sales
      WHERE user_id = $1
      GROUP BY DATE_TRUNC('${truncFunction}', sold_at)
      ORDER BY period DESC
      LIMIT $2`,
      [userId, limit]
    );

    const trends: ProfitTrend[] = result.rows.map((row) => ({
      period: row.period.toISOString().split('T')[0],
      profit: parseFloat(row.profit),
      sales: parseInt(row.sales),
      avgProfit: parseFloat(row.avg_profit),
    })).reverse(); // Oldest first for chart display

    await cache.set(cacheKey, trends, PROFIT_CACHE_TTL);

    return trends;
  },

  /**
   * Get profit breakdown by category
   */
  async getProfitByCategory(userId: string): Promise<CategoryProfit[]> {
    const cacheKey = cache.keys.custom(`profit:categories:${userId}`);

    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    const result = await db.query(
      `SELECT
        o.item_category as category,
        SUM(s.profit) as profit,
        COUNT(s.*) as sales,
        AVG(s.profit) as avg_profit,
        AVG(s.profit_margin) as profit_margin
      FROM sales s
      JOIN offers o ON s.offer_id = o.id
      WHERE s.user_id = $1
      GROUP BY o.item_category
      ORDER BY profit DESC`,
      [userId]
    );

    const categoryProfits: CategoryProfit[] = result.rows.map((row) => ({
      category: row.category || 'Unknown',
      profit: parseFloat(row.profit),
      sales: parseInt(row.sales),
      avgProfit: parseFloat(row.avg_profit),
      profitMargin: parseFloat(row.profit_margin || 0),
    }));

    await cache.set(cacheKey, categoryProfits, PROFIT_CACHE_TTL);

    return categoryProfits;
  },

  /**
   * Get profit projections from pending offers
   */
  async getProfitProjections(userId: string): Promise<ProfitProjection> {
    const cacheKey = cache.keys.custom(`profit:projections:${userId}`);

    const cached = await cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Get active offers (ready or accepted status)
    const result = await db.query(
      `SELECT
        COUNT(*) as pending_offers,
        COALESCE(SUM(fmv), 0) as estimated_revenue,
        COALESCE(SUM(offer_amount + COALESCE(estimated_shipping_cost, 8.50) + COALESCE(estimated_platform_fees, 0)), 0) as estimated_costs
      FROM offers
      WHERE user_id = $1
        AND status IN ('ready', 'accepted')
        AND expires_at > NOW()`,
      [userId]
    );

    const row = result.rows[0];
    const estimatedRevenue = parseFloat(row.estimated_revenue || 0);
    const estimatedCosts = parseFloat(row.estimated_costs || 0);
    const estimatedProfit = estimatedRevenue - estimatedCosts;

    const projection: ProfitProjection = {
      pendingOffers: parseInt(row.pending_offers),
      estimatedRevenue,
      estimatedCosts,
      estimatedProfit,
      ifAllAcceptedProfit: estimatedProfit,
    };

    await cache.set(cacheKey, projection, 600); // Cache for 10 minutes (more volatile)

    return projection;
  },

  /**
   * Update estimated profit for an offer
   */
  async updateEstimatedProfit(offerId: string): Promise<void> {
    const offer = await db.findOne('offers', { id: offerId });
    if (!offer || !offer.fmv || !offer.offer_amount) {
      return; // Can't estimate without pricing data
    }

    const estimatedShippingCost = offer.estimated_shipping_cost || 8.50;
    const estimatedPlatformFees = offer.estimated_platform_fees || 0;

    const estimatedProfit = offer.fmv - (offer.offer_amount + estimatedShippingCost + estimatedPlatformFees);

    await db.update('offers', { id: offerId }, {
      estimated_profit: estimatedProfit,
    });

    logger.debug({ offerId, estimatedProfit }, 'Updated estimated profit for offer');
  },
};
