/**
 * Test script for SEO title generation and search functionality.
 * Run with: npx tsx src/scripts/test-seo.ts
 */
import { db } from '../db/client.js';
import { logger } from '../utils/logger.js';

async function testSEOFeatures() {
  logger.info('Testing SEO features...');

  try {
    // 1. Check if seo_title column exists
    logger.info('Checking database schema...');
    const schemaCheck = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'offers' AND column_name = 'seo_title'
    `);

    if (schemaCheck.rows.length === 0) {
      logger.error('❌ seo_title column does not exist. Run migration first.');
      process.exit(1);
    }
    logger.info('✓ seo_title column exists');

    // 2. Check for pg_trgm extension
    const extensionCheck = await db.query(`
      SELECT * FROM pg_extension WHERE extname = 'pg_trgm'
    `);

    if (extensionCheck.rows.length === 0) {
      logger.error('❌ pg_trgm extension not installed. Run migration first.');
      process.exit(1);
    }
    logger.info('✓ pg_trgm extension installed');

    // 3. Check for search indexes
    const indexCheck = await db.query(`
      SELECT indexname FROM pg_indexes
      WHERE tablename = 'offers'
        AND (indexname LIKE '%search%' OR indexname LIKE '%trgm%')
    `);

    logger.info(`✓ Found ${indexCheck.rows.length} search indexes:`,
      indexCheck.rows.map(r => r.indexname)
    );

    // 4. Test search query (if there are offers)
    logger.info('Testing search query...');
    const searchTest = await db.query(`
      SELECT COUNT(*) as count FROM offers WHERE status = 'ready'
    `);

    const offerCount = parseInt(searchTest.rows[0].count, 10);
    logger.info(`Found ${offerCount} ready offers`);

    if (offerCount > 0) {
      // Try a sample search
      const searchResult = await db.query(`
        SELECT
          id,
          item_brand,
          item_model,
          seo_title,
          ts_rank(
            to_tsvector('english',
              COALESCE(item_brand, '') || ' ' ||
              COALESCE(item_model, '') || ' ' ||
              COALESCE(item_category, '')
            ),
            plainto_tsquery('english', 'phone')
          ) AS relevance
        FROM offers
        WHERE status = 'ready'
          AND to_tsvector('english',
            COALESCE(item_brand, '') || ' ' ||
            COALESCE(item_model, '') || ' ' ||
            COALESCE(item_category, '')
          ) @@ plainto_tsquery('english', 'phone')
        ORDER BY relevance DESC
        LIMIT 5
      `);

      logger.info(`✓ Search test returned ${searchResult.rows.length} results`);
      if (searchResult.rows.length > 0) {
        logger.info('Sample result:', {
          brand: searchResult.rows[0].item_brand,
          model: searchResult.rows[0].item_model,
          seoTitle: searchResult.rows[0].seo_title,
          relevance: searchResult.rows[0].relevance,
        });
      }
    }

    // 5. Check SEO titles coverage
    const seoTitleStats = await db.query(`
      SELECT
        COUNT(*) as total,
        COUNT(seo_title) as with_seo_title,
        ROUND(100.0 * COUNT(seo_title) / COUNT(*), 2) as coverage_pct
      FROM offers
      WHERE status = 'ready'
    `);

    if (seoTitleStats.rows.length > 0) {
      const stats = seoTitleStats.rows[0];
      logger.info(`SEO Title Coverage:`, {
        total: stats.total,
        withSeoTitle: stats.with_seo_title,
        coveragePercent: `${stats.coverage_pct}%`,
      });
    }

    logger.info('✅ All SEO feature tests passed!');
  } catch (err: any) {
    logger.error('❌ SEO feature test failed:', err.message);
    process.exit(1);
  }
}

// Run tests
testSEOFeatures()
  .then(() => process.exit(0))
  .catch((err) => {
    logger.error('Unexpected error:', err);
    process.exit(1);
  });
