/**
 * Seed Profit Test Data
 *
 * Creates mock sales data for testing the profit dashboard
 */

import 'dotenv/config';
import { db } from '../db/client.js';
import { logger } from '../utils/logger.js';

const MOCK_USER_ID = '00000000-0000-0000-0000-000000000001'; // Mock UUID for testing

async function seedProfitData() {
  try {
    logger.info('Seeding profit test data...');

    // Check if user exists, create if not
    let user = await db.findOne('users', { id: MOCK_USER_ID });
    if (!user) {
      logger.info('Creating mock user...');
      await db.query(
        `INSERT INTO users (id, email, name, verified, role)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (id) DO NOTHING`,
        [MOCK_USER_ID, 'mock@example.com', 'Test User', true, 'user']
      );
    }

    // Create mock offers if they don't exist (using valid UUIDs)
    const mockOffers = [
      {
        id: '00000000-0000-0000-0000-000000000011',
        category: 'Electronics',
        brand: 'Apple',
        model: 'iPhone 13 Pro',
        offer_amount: 450,
        fmv: 650,
      },
      {
        id: '00000000-0000-0000-0000-000000000012',
        category: 'Gaming',
        brand: 'Sony',
        model: 'PlayStation 5',
        offer_amount: 380,
        fmv: 550,
      },
      {
        id: '00000000-0000-0000-0000-000000000013',
        category: 'Electronics',
        brand: 'Apple',
        model: 'AirPods Pro',
        offer_amount: 120,
        fmv: 180,
      },
      {
        id: '00000000-0000-0000-0000-000000000014',
        category: 'Phones & Tablets',
        brand: 'Samsung',
        model: 'Galaxy S23',
        offer_amount: 350,
        fmv: 500,
      },
      {
        id: '00000000-0000-0000-0000-000000000015',
        category: 'Gaming',
        brand: 'Microsoft',
        model: 'Xbox Series X',
        offer_amount: 320,
        fmv: 480,
      },
      {
        id: '00000000-0000-0000-0000-000000000016',
        category: 'Electronics',
        brand: 'Apple',
        model: 'MacBook Air M1',
        offer_amount: 650,
        fmv: 900,
      },
    ];

    for (const offer of mockOffers) {
      await db.query(
        `INSERT INTO offers (id, user_id, status, item_category, item_brand, item_model, offer_amount, fmv, photos, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW() + INTERVAL '24 hours')
         ON CONFLICT (id) DO UPDATE SET
           offer_amount = EXCLUDED.offer_amount,
           fmv = EXCLUDED.fmv`,
        [
          offer.id,
          MOCK_USER_ID,
          'paid', // Mark as paid so they appear as completed
          offer.category,
          offer.brand,
          offer.model,
          offer.offer_amount,
          offer.fmv,
          JSON.stringify([{ url: 'https://example.com/photo.jpg', uploaded_at: new Date() }]),
        ]
      );
    }

    logger.info('Mock offers created/updated');

    // Create sales records with profit data
    const sales = [
      {
        offerId: '00000000-0000-0000-0000-000000000011',
        soldPrice: 640, // Sold near FMV
        soldAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000), // 2 weeks ago
        shippingCost: 9.50,
        ebayFees: 64.0, // 10% eBay fees
        platform: 'ebay',
      },
      {
        offerId: '00000000-0000-0000-0000-000000000012',
        soldPrice: 545,
        soldAt: new Date(Date.now() - 12 * 24 * 60 * 60 * 1000),
        shippingCost: 12.00,
        ebayFees: 54.5,
        platform: 'ebay',
      },
      {
        offerId: '00000000-0000-0000-0000-000000000013',
        soldPrice: 175,
        soldAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        shippingCost: 5.50,
        ebayFees: 17.5,
        platform: 'ebay',
      },
      {
        offerId: '00000000-0000-0000-0000-000000000014',
        soldPrice: 490,
        soldAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
        shippingCost: 8.50,
        ebayFees: 49.0,
        platform: 'ebay',
      },
      {
        offerId: '00000000-0000-0000-0000-000000000015',
        soldPrice: 470,
        soldAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        shippingCost: 10.00,
        ebayFees: 47.0,
        platform: 'ebay',
      },
      {
        offerId: '00000000-0000-0000-0000-000000000016',
        soldPrice: 890,
        soldAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        shippingCost: 15.00,
        ebayFees: 89.0,
        platform: 'ebay',
      },
    ];

    for (const sale of sales) {
      const offer = mockOffers.find(o => o.id === sale.offerId);
      if (!offer) continue;

      const totalCosts = offer.offer_amount + sale.shippingCost + sale.ebayFees;
      const profit = sale.soldPrice - totalCosts;
      const profitMargin = (profit / sale.soldPrice) * 100;

      // Check if sale exists first
      const existing = await db.query(
        'SELECT id FROM sales WHERE offer_id = $1',
        [sale.offerId]
      );

      if (existing.rows.length === 0) {
        // Insert new sale
        await db.query(
          `INSERT INTO sales (offer_id, user_id, sold_price, sold_at, offer_amount, shipping_cost, ebay_fees, platform_fees, total_costs, profit, profit_margin, sale_platform)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          [
            sale.offerId,
            MOCK_USER_ID,
            sale.soldPrice,
            sale.soldAt,
            offer.offer_amount,
            sale.shippingCost,
            sale.ebayFees,
            0, // platform_fees
            totalCosts,
            profit,
            profitMargin,
            sale.platform,
          ]
        );
      } else {
        // Update existing sale
        await db.query(
          `UPDATE sales SET
             sold_price = $1,
             profit = $2,
             profit_margin = $3,
             total_costs = $4
           WHERE offer_id = $5`,
          [sale.soldPrice, profit, profitMargin, totalCosts, sale.offerId]
        );
      }

      logger.info({ offerId: sale.offerId, profit }, 'Sale record created');
    }

    logger.info('✅ Profit test data seeded successfully');
    logger.info(`User ID: ${MOCK_USER_ID}`);
    logger.info(`Total sales: ${sales.length}`);

    const totalProfit = sales.reduce((sum, sale) => {
      const offer = mockOffers.find(o => o.id === sale.offerId)!;
      const totalCosts = offer.offer_amount + sale.shippingCost + sale.ebayFees;
      return sum + (sale.soldPrice - totalCosts);
    }, 0);

    logger.info(`Total profit: $${totalProfit.toFixed(2)}`);

  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to seed profit data');
    throw error;
  } finally {
    await db.disconnect();
  }
}

seedProfitData();
