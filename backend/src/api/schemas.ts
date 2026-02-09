/**
 * Zod validation schemas for all API request bodies.
 */
import { z } from 'zod';

// === Auth ===

export const registerSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
  name: z.string().max(100).optional(),
  phone: z.string().max(20).optional(),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address').max(255),
  password: z.string().min(1, 'Password required').max(128),
});

export const refreshSchema = z.object({
  refreshToken: z.string().uuid('Invalid refresh token'),
});

// === Offers ===

export const createOfferSchema = z.object({
  photoUrls: z
    .array(z.string().url('Invalid photo URL'))
    .min(1, 'At least one photo URL required')
    .max(6, 'Maximum 6 photos allowed'),
  userDescription: z.string().max(1000).optional(),
});

export const declineOfferSchema = z.object({
  reason: z.string().max(500).optional(),
});

export const listOffersQuerySchema = z.object({
  status: z.enum(['processing', 'ready', 'accepted', 'declined', 'expired', 'shipped', 'received', 'verified', 'paid', 'disputed', 'rejected', 'cancelled']).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

// === Helpers ===

export const uuidParamSchema = z.object({
  id: z.string().uuid('Invalid ID format'),
});

/**
 * Validate request body against a Zod schema.
 * Returns parsed data or throws a 400 error with details.
 */
export function validateBody<T>(schema: z.ZodSchema<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    const err: any = new Error(errors.join('; '));
    err.statusCode = 400;
    throw err;
  }
  return result.data;
}

/**
 * Validate request params against a Zod schema.
 */
export function validateParams<T>(schema: z.ZodSchema<T>, params: unknown): T {
  const result = schema.safeParse(params);
  if (!result.success) {
    const err: any = new Error('Invalid request parameters');
    err.statusCode = 400;
    throw err;
  }
  return result.data;
}

/**
 * Validate query string against a Zod schema.
 */
export function validateQuery<T>(schema: z.ZodSchema<T>, query: unknown): T {
  const result = schema.safeParse(query);
  if (!result.success) {
    const errors = result.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`);
    const err: any = new Error(errors.join('; '));
    err.statusCode = 400;
    throw err;
  }
  return result.data;
}
