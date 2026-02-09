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

// === Admin ===

const offerStatusEnum = z.enum(['processing', 'ready', 'accepted', 'declined', 'expired', 'shipped', 'received', 'verified', 'paid', 'disputed', 'rejected', 'cancelled']);
const adminRoleEnum = z.enum(['user', 'admin', 'super_admin', 'reviewer', 'warehouse']);
const payoutStatusEnum = z.enum(['pending', 'processing', 'completed', 'failed']);
const shipmentStatusEnum = z.enum(['label_created', 'in_transit', 'delivered', 'exception']);

export const adminListQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(25),
  offset: z.coerce.number().int().min(0).default(0),
  search: z.string().max(200).optional(),
  sort: z.string().max(50).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

export const adminOffersQuerySchema = adminListQuerySchema.extend({
  status: offerStatusEnum.optional(),
  escalated: z.coerce.boolean().optional(),
  category: z.string().max(100).optional(),
  minAmount: z.coerce.number().optional(),
  maxAmount: z.coerce.number().optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const adminUpdateOfferSchema = z.object({
  offer_amount: z.number().positive().optional(),
  status: offerStatusEnum.optional(),
  escalation_notes: z.any().optional(),
  reviewer_id: z.string().uuid().optional(),
});

export const adminPayoutsQuerySchema = adminListQuerySchema.extend({
  status: payoutStatusEnum.optional(),
  method: z.enum(['paypal', 'venmo', 'zelle', 'bank', 'jake_bucks']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const adminProcessPayoutSchema = z.object({
  action: z.enum(['approve', 'reject']),
  transaction_ref: z.string().max(200).optional(),
  failure_reason: z.string().max(500).optional(),
});

export const adminShipmentsQuerySchema = adminListQuerySchema.extend({
  status: shipmentStatusEnum.optional(),
  carrier: z.string().max(50).optional(),
});

export const adminUsersQuerySchema = adminListQuerySchema.extend({
  role: adminRoleEnum.optional(),
  banned: z.coerce.boolean().optional(),
  verified: z.coerce.boolean().optional(),
});

export const adminUpdateUserSchema = z.object({
  role: adminRoleEnum.optional(),
  banned: z.boolean().optional(),
  ban_reason: z.string().max(500).optional(),
  trust_score: z.number().min(0).max(100).optional(),
  verified: z.boolean().optional(),
});

export const adminEscalationsQuerySchema = adminListQuerySchema.extend({
  status: z.enum(['open', 'claimed', 'resolved']).optional(),
});

export const adminResolveEscalationSchema = z.object({
  decision: z.enum(['approve', 'adjust', 'reject']),
  revised_amount: z.number().positive().optional(),
  notes: z.string().max(1000),
});

export const adminFraudQuerySchema = adminListQuerySchema.extend({
  result: z.enum(['pass', 'flag', 'fail']).optional(),
  check_type: z.string().max(50).optional(),
});

export const adminUpdateConfigSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.any(),
});

export const adminAuditQuerySchema = adminListQuerySchema.extend({
  entity_type: z.string().max(50).optional(),
  action: z.string().max(50).optional(),
  actor_type: z.enum(['user', 'admin', 'system']).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
});

export const adminGenerateLabelSchema = z.object({
  offer_id: z.string().uuid(),
  address: z.object({
    name: z.string().max(100),
    street: z.string().max(200),
    city: z.string().max(100),
    state: z.string().max(2),
    zip: z.string().max(10),
  }),
  carrier: z.string().max(50).default('USPS'),
  service: z.string().max(50).default('Priority'),
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
