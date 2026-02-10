/**
 * Verify schema changes script
 */
import { db } from '../db/client.js';
import { logger } from '../utils/logger.js';

async function verifySchema() {
  try {
    const result = await db.query(`
      SELECT column_name, data_type, character_maximum_length, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'offers'
      AND column_name IN ('condition_grade', 'condition_notes', 'pricing_confidence', 'comparable_sales')
      ORDER BY column_name;
    `);

    console.log('\n=== New Columns in offers table ===\n');
    result.rows.forEach(row => {
      console.log(`${row.column_name}:`);
      console.log(`  Type: ${row.data_type}${row.character_maximum_length ? `(${row.character_maximum_length})` : ''}`);
      console.log(`  Nullable: ${row.is_nullable}`);
      console.log('');
    });

    // Check indexes
    const indexResult = await db.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'offers'
      AND indexname IN ('idx_offers_condition_grade', 'idx_offers_pricing_confidence')
      ORDER BY indexname;
    `);

    console.log('=== New Indexes ===\n');
    indexResult.rows.forEach(row => {
      console.log(`${row.indexname}:`);
      console.log(`  ${row.indexdef}`);
      console.log('');
    });

    logger.info('Schema verification completed');
    process.exit(0);
  } catch (error: any) {
    logger.error({ error: error.message }, 'Schema verification failed');
    process.exit(1);
  }
}

verifySchema();
