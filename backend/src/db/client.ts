import pg from 'pg';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const { Pool } = pg;

class Database {
  private pool: pg.Pool;

  constructor() {
    this.pool = new Pool({
      connectionString: config.database.url,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });

    this.pool.on('error', (err) => {
      logger.error('Unexpected database error', err);
    });
  }

  async connect() {
    try {
      const client = await this.pool.connect();
      logger.info('Database connection verified');
      client.release();
    } catch (error) {
      logger.error('Failed to connect to database', error);
      throw error;
    }
  }

  async disconnect() {
    await this.pool.end();
    logger.info('Database pool closed');
  }

  async query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
    const start = Date.now();
    try {
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      if (duration > 1000) {
        logger.warn({ text, duration }, 'Slow query detected');
      }

      return result;
    } catch (error) {
      logger.error({ text, params, error }, 'Query error');
      throw error;
    }
  }

  async getClient() {
    return await this.pool.connect();
  }

  // Helper methods
  async findOne<T = any>(table: string, conditions: Record<string, any>): Promise<T | null> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClauses = keys.map((key, i) => `${key} = $${i + 1}`);

    const query = `SELECT * FROM ${table} WHERE ${whereClauses.join(' AND ')} LIMIT 1`;
    const result = await this.query<T>(query, values);

    return result.rows[0] || null;
  }

  async findMany<T = any>(table: string, conditions: Record<string, any> = {}): Promise<T[]> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);

    let query = `SELECT * FROM ${table}`;
    if (keys.length > 0) {
      const whereClauses = keys.map((key, i) => `${key} = $${i + 1}`);
      query += ` WHERE ${whereClauses.join(' AND ')}`;
    }

    const result = await this.query<T>(query, values);
    return result.rows;
  }

  async create<T = any>(table: string, data: Record<string, any>): Promise<T> {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`);

    const query = `
      INSERT INTO ${table} (${keys.join(', ')})
      VALUES (${placeholders.join(', ')})
      RETURNING *
    `;

    const result = await this.query<T>(query, values);
    return result.rows[0];
  }

  async update<T = any>(
    table: string,
    conditions: Record<string, any>,
    data: Record<string, any>
  ): Promise<T | null> {
    const dataKeys = Object.keys(data);
    const dataValues = Object.values(data);
    const condKeys = Object.keys(conditions);
    const condValues = Object.values(conditions);

    const setClauses = dataKeys.map((key, i) => `${key} = $${i + 1}`);
    const whereClauses = condKeys.map((key, i) => `${key} = $${dataKeys.length + i + 1}`);

    const query = `
      UPDATE ${table}
      SET ${setClauses.join(', ')}
      WHERE ${whereClauses.join(' AND ')}
      RETURNING *
    `;

    const result = await this.query<T>(query, [...dataValues, ...condValues]);
    return result.rows[0] || null;
  }

  async delete(table: string, conditions: Record<string, any>): Promise<number> {
    const keys = Object.keys(conditions);
    const values = Object.values(conditions);
    const whereClauses = keys.map((key, i) => `${key} = $${i + 1}`);

    const query = `DELETE FROM ${table} WHERE ${whereClauses.join(' AND ')}`;
    const result = await this.query(query, values);

    return result.rowCount || 0;
  }
}

export const db = new Database();
