/**
 * Migration runner script
 * Usage: npx tsx src/scripts/run-migration.ts <migration-file>
 */
import { readFileSync } from 'fs';
import { join } from 'path';
import { db } from '../db/client.js';
import { logger } from '../utils/logger.js';

async function runMigration(migrationFile: string) {
  const migrationPath = join(process.cwd(), 'src', 'db', 'migrations', migrationFile);

  try {
    const sql = readFileSync(migrationPath, 'utf8');
    logger.info({ migrationFile }, 'Running migration');

    await db.query(sql);

    logger.info({ migrationFile }, 'Migration completed successfully');
    process.exit(0);
  } catch (error: any) {
    logger.error({ migrationFile, error: error.message }, 'Migration failed');
    process.exit(1);
  }
}

const migrationFile = process.argv[2];
if (!migrationFile) {
  console.error('Usage: npx tsx src/scripts/run-migration.ts <migration-file>');
  process.exit(1);
}

runMigration(migrationFile);
