import { db } from '../db/client.js';

async function applyMigration() {
  try {
    console.log('Applying minimal SEO migration...');

    // Add seo_title column
    await db.query(`
      ALTER TABLE offers
      ADD COLUMN IF NOT EXISTS seo_title TEXT
    `);
    console.log('✓ Added seo_title column');

    // Create basic index
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_offers_seo_title
      ON offers(seo_title)
      WHERE seo_title IS NOT NULL
    `);
    console.log('✓ Created seo_title index');

    // Add comment
    await db.query(`
      COMMENT ON COLUMN offers.seo_title IS 'AI-generated SEO-optimized title for search engines (60-70 chars)'
    `);
    console.log('✓ Added column comment');

    console.log('\n✓ Migration applied successfully (trigram indexes skipped - require superuser)');

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('✓ Migration already applied');
    } else {
      console.error('✗ Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    await db.disconnect();
  }
}

applyMigration();
