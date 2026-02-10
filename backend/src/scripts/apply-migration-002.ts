import { db } from '../db/client.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function applyMigration() {
  try {
    const migrationPath = join(__dirname, '../db/migrations/002_add_seo_and_search.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('Applying migration 002_add_seo_and_search.sql...');

    // Split SQL by semicolons and execute each statement
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--'));

    for (const statement of statements) {
      if (statement) {
        await db.query(statement);
      }
    }

    console.log('✓ Migration applied successfully');

  } catch (error: any) {
    if (error.message?.includes('already exists')) {
      console.log('✓ Migration already applied');
    } else {
      console.error('✗ Migration failed:', error.message);
      process.exit(1);
    }
  } finally {
    await db.close();
  }
}

applyMigration();
