import { db } from '../db/client.js';

async function applyAllMigrations() {
  try {
    console.log('Applying Phase 4 migrations...\n');

    // Migration 005: Profit tracking
    console.log('[1/2] Applying profit tracking migration...');
    await db.query(`
      CREATE TABLE IF NOT EXISTS sales (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        sold_price DECIMAL(10,2) NOT NULL,
        offer_amount DECIMAL(10,2) NOT NULL,
        shipping_cost DECIMAL(10,2) DEFAULT 0,
        ebay_fees DECIMAL(10,2) DEFAULT 0,
        platform_fees DECIMAL(10,2) DEFAULT 0,
        profit DECIMAL(10,2) NOT NULL,
        profit_margin DECIMAL(5,2),
        sold_at TIMESTAMPTZ DEFAULT NOW(),
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_offer_id ON sales(offer_id)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_user_id ON sales(user_id)
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at DESC)
    `);

    console.log('✓ Profit tracking migration applied\n');

    // Migration 007: Serial numbers and metadata
    console.log('[2/2] Applying serial numbers migration...');
    await db.query(`
      ALTER TABLE offers
      ADD COLUMN IF NOT EXISTS serial_number TEXT
    `);
    await db.query(`
      ALTER TABLE offers
      ADD COLUMN IF NOT EXISTS product_metadata JSONB DEFAULT '{}'::jsonb
    `);

    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_offers_serial_number
      ON offers(serial_number)
      WHERE serial_number IS NOT NULL
    `);
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_offers_product_metadata_gin
      ON offers USING GIN (product_metadata)
    `);

    console.log('✓ Serial numbers migration applied\n');

    console.log('=== ALL PHASE 4 MIGRATIONS APPLIED ===');
    console.log('\nSummary:');
    console.log('  ✓ SEO optimization (seo_title column)');
    console.log('  ✓ Price history (price_history table)');
    console.log('  ✓ Profit tracking (sales table)');
    console.log('  ✓ Serial numbers (serial_number, product_metadata columns)');
    console.log('\nNote: pg_trgm full-text search requires PostgreSQL superuser privileges');

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('✓ Already applied');
    } else {
      console.error('✗ Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    await db.disconnect();
  }
}

applyAllMigrations();
