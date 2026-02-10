/**
 * Apply Loyalty System Migration
 * Adds Frontier Club 3-tier loyalty system to the database
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { Client } = pg;

async function applyMigration() {
  const client = new Client({
    connectionString: config.database.url,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Read migration file
    const migrationPath = join(__dirname, '../db/migrations/001_add_loyalty_system.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('Applying loyalty system migration...');
    await client.query(migrationSQL);

    console.log('✓ Loyalty system migration applied successfully');

    // Verify tables were created
    const tables = await client.query(`
      SELECT tablename FROM pg_tables
      WHERE schemaname = 'public'
      AND tablename IN ('loyalty_tier_transitions', 'loyalty_redemptions', 'loyalty_redemption_history')
    `);

    console.log(`\n✓ Created ${tables.rows.length} loyalty tables:`);
    tables.rows.forEach(row => console.log(`  - ${row.tablename}`));

    // Verify config entries
    const configCheck = await client.query(`
      SELECT key FROM config
      WHERE key IN ('loyalty_tiers', 'jake_bucks_rules')
    `);

    console.log(`\n✓ Created ${configCheck.rows.length} config entries:`);
    configCheck.rows.forEach(row => console.log(`  - ${row.key}`));

    // Show redemption catalog
    const catalog = await client.query('SELECT id, name, cost FROM loyalty_redemptions ORDER BY cost');
    console.log(`\n✓ Loaded ${catalog.rows.length} redemption items:`);
    catalog.rows.forEach(row => console.log(`  - ${row.name} (${row.cost} Jake Bucks)`));

    console.log('\n🎉 Frontier Club loyalty system is ready!');

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

applyMigration();
