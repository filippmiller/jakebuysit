/**
 * Encryption utilities using PostgreSQL pgcrypto
 * Used for encrypting sensitive data like OAuth tokens
 */
import { db } from '../db/client.js';
import { config } from '../config.js';
import { logger } from './logger.js';

/**
 * Encrypt text using pgcrypto symmetric encryption
 * Uses AES-256 with key from environment variable
 */
export async function encrypt(plaintext: string): Promise<Buffer> {
  if (!config.encryptionKey) {
    throw new Error('ENCRYPTION_KEY not set in environment');
  }

  try {
    const result = await db.query(
      `SELECT pgp_sym_encrypt($1, $2) AS encrypted`,
      [plaintext, config.encryptionKey]
    );

    return result.rows[0].encrypted;
  } catch (err: any) {
    logger.error({ error: err.message }, 'Encryption failed');
    throw new Error(`Failed to encrypt data: ${err.message}`);
  }
}

/**
 * Decrypt data using pgcrypto symmetric decryption
 */
export async function decrypt(encrypted: Buffer): Promise<string> {
  if (!config.encryptionKey) {
    throw new Error('ENCRYPTION_KEY not set in environment');
  }

  try {
    const result = await db.query(
      `SELECT pgp_sym_decrypt($1, $2) AS decrypted`,
      [encrypted, config.encryptionKey]
    );

    return result.rows[0].decrypted;
  } catch (err: any) {
    logger.error({ error: err.message }, 'Decryption failed');
    throw new Error(`Failed to decrypt data: ${err.message}`);
  }
}

/**
 * Encrypt an object's sensitive fields
 * Returns a new object with specified fields encrypted
 */
export async function encryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): Promise<T> {
  const encrypted = { ...obj };

  for (const field of fields) {
    if (typeof obj[field] === 'string') {
      encrypted[field] = await encrypt(obj[field] as string) as any;
    }
  }

  return encrypted;
}

/**
 * Decrypt an object's encrypted fields
 * Returns a new object with specified fields decrypted
 */
export async function decryptFields<T extends Record<string, any>>(
  obj: T,
  fields: (keyof T)[]
): Promise<T> {
  const decrypted = { ...obj };

  for (const field of fields) {
    if (Buffer.isBuffer(obj[field])) {
      decrypted[field] = await decrypt(obj[field] as Buffer) as any;
    }
  }

  return decrypted;
}
