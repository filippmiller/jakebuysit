# Security Fix: Profit API Authentication - 2026-02-10

**Status**: ✅ Completed and Deployed
**Severity**: CRITICAL (Privacy Violation)
**Duration**: ~25 minutes
**Commit**: 595151b0

---

## CRITICAL VULNERABILITY

### The Problem

The profit API at `backend/src/api/routes/profits.ts` had **NO AUTHENTICATION**.

**Attack Vector:**
```bash
# Anyone could query ANY user's profit data
curl http://localhost:8080/api/v1/profits/summary?userId=<any-uuid>
curl http://localhost:8080/api/v1/profits/trends?userId=<any-uuid>
curl http://localhost:8080/api/v1/profits/by-category?userId=<any-uuid>
curl http://localhost:8080/api/v1/profits/projections?userId=<any-uuid>
```

**Impact:**
- Complete privacy breach
- Competitive intelligence leakage
- Potential for fraud/manipulation
- GDPR/privacy law violation

---

## The Fix

### 1. Backend Changes (`backend/src/api/routes/profits.ts`)

#### Added Imports:
```typescript
import { requireAuth } from '../middleware/auth.js';
import { cache } from '../../db/redis.js';
import { db } from '../../db/client.js';
```

#### Applied to All 5 Endpoints:

**Before:**
```typescript
fastify.get('/summary', {
  schema: {
    querystring: {
      properties: {
        userId: { type: 'string' }
      },
      required: ['userId']
    }
  }
}, async (request, reply) => {
  const { userId } = request.query;
  // ... no ownership check
});
```

**After:**
```typescript
fastify.get('/summary', {
  preHandler: requireAuth,  // ← JWT required
  schema: {
    security: [{ bearerAuth: [] }],  // ← OpenAPI security
    // NO userId in querystring
  }
}, async (request, reply) => {
  const userId = (request as any).userId;  // ← From JWT

  // Rate limit: 10 requests per minute per user
  const rateKey = cache.keys.rateLimitUser(userId, 'profit-1m');
  const count = await cache.incrementWithExpiry(rateKey, 60);
  if (count > 10) {
    return reply.status(429).send({
      error: 'Too many requests. Wait a minute, partner.'
    });
  }

  // ... rest of logic
});
```

**Endpoints Fixed:**
1. `GET /api/v1/profits/summary` - Profit summary
2. `GET /api/v1/profits/trends` - Profit trends over time
3. `GET /api/v1/profits/by-category` - Category breakdown
4. `GET /api/v1/profits/projections` - Pending offer projections
5. `POST /api/v1/profits/record-sale` - Record completed sale

**Special: POST /record-sale**
- Added offer ownership verification:
```typescript
const offer = await db.findOne('offers', { id: body.offerId });
if (!offer) {
  return reply.status(404).send({ error: 'Offer not found' });
}
if (offer.user_id !== userId) {
  return reply.status(403).send({
    error: 'You can only record sales for your own offers, partner.'
  });
}
```

---

### 2. Frontend Changes

#### `web/lib/api-client.ts` (Lines 306-368)

**Before:**
```typescript
async getProfitSummary(userId: string): Promise<ProfitSummary> {
  const response = await this.fetchWithTimeout(
    `${this.baseUrl}/api/v1/profits/summary?userId=${userId}`
  );
  // ... no auth headers
}
```

**After:**
```typescript
async getProfitSummary(): Promise<ProfitSummary> {
  const response = await this.fetchWithTimeout(
    `${this.baseUrl}/api/v1/profits/summary`,
    {
      headers: this.getAuthHeaders(),  // ← Sends JWT from localStorage
    }
  );
  // ...
}
```

**Changes Applied:**
- Removed `userId` parameter from all profit API methods
- Added `this.getAuthHeaders()` to send JWT token
- Updated JSDoc comments to reflect authentication requirement

#### `web/app/dashboard/profits/page.tsx` (Lines 57-85)

**Before:**
```typescript
const userId = "00000000-0000-0000-0000-000000000001";

const [summaryData, trendsData, categoryData, projectionData] = await Promise.all([
  apiClient.getProfitSummary(userId),
  apiClient.getProfitTrends(userId, interval, 12),
  apiClient.getProfitByCategory(userId),
  apiClient.getProfitProjections(userId),
]);
```

**After:**
```typescript
// No userId needed - extracted from JWT automatically
const [summaryData, trendsData, categoryData, projectionData] = await Promise.all([
  apiClient.getProfitSummary(),
  apiClient.getProfitTrends(interval, 12),
  apiClient.getProfitByCategory(),
  apiClient.getProfitProjections(),
]);
```

---

### 3. Test Script (`backend/test-profit-auth.sh`)

Created comprehensive test script to verify security:

```bash
bash backend/test-profit-auth.sh
```

**Tests:**
1. ✓ Returns 401 without auth
2. ✓ Returns 401 even with userId query param (ignored)
3. ✓ Login and get valid token
4. ✓ Returns 200 with valid JWT
5. ✓ All 4 GET endpoints work with auth

---

## Security Improvements Applied

| Improvement | Impact |
|-------------|--------|
| **JWT Authentication** | Users can ONLY access their own profit data |
| **Rate Limiting** | 10 requests/min per user prevents abuse |
| **Offer Ownership Check** | Users can only record sales for their own offers |
| **Query String Removal** | userId cannot be manipulated via URL |
| **Token Extraction** | userId comes from verified JWT, not user input |

---

## Verification

### Manual Test (No Auth - Should Fail):
```bash
curl -i http://localhost:8080/api/v1/profits/summary
# Expected: 401 Unauthorized
```

### Manual Test (With Auth - Should Succeed):
```bash
# 1. Login
TOKEN=$(curl -s -X POST http://localhost:8080/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@jakebuysit.com","password":"testpass123"}' \
  | jq -r '.accessToken')

# 2. Query profit data
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/v1/profits/summary
# Expected: 200 OK with profit data
```

### Rate Limit Test:
```bash
# Run 11 times in under 60 seconds
for i in {1..11}; do
  curl -H "Authorization: Bearer $TOKEN" \
    http://localhost:8080/api/v1/profits/summary
done
# Expected: First 10 succeed, 11th returns 429 Too Many Requests
```

---

## Files Modified

| File | Lines Changed | Purpose |
|------|---------------|---------|
| `backend/src/api/routes/profits.ts` | 16-274 | Added auth middleware, rate limiting, ownership checks |
| `web/lib/api-client.ts` | 306-368 | Removed userId param, added auth headers |
| `web/app/dashboard/profits/page.tsx` | 57-85 | Updated API calls to remove userId param |
| `backend/test-profit-auth.sh` | New file | Test script for verifying security fix |

**Total Changes:**
- 181 insertions
- 55 deletions
- 4 files changed

---

## Technical Details

### JWT Flow:

1. User logs in → receives JWT access token
2. Frontend stores token in localStorage
3. API client automatically adds `Authorization: Bearer <token>` header
4. Backend middleware `requireAuth` verifies JWT signature
5. Decoded JWT contains `{ sub: userId, email: userEmail }`
6. Middleware attaches `request.userId` from JWT payload
7. Route handler uses `request.userId` (verified by cryptography)

### Rate Limiting:

- **Key**: `ratelimit:user:{userId}:profit-1m`
- **TTL**: 60 seconds
- **Limit**: 10 requests
- **Scope**: Per-user (isolation prevents one user from blocking others)
- **Response**: 429 Too Many Requests after limit exceeded

### Authentication Middleware:

From `backend/src/api/middleware/auth.ts`:
```typescript
export async function requireAuth(request: FastifyRequest, reply: FastifyReply) {
  try {
    const decoded = await request.jwtVerify();
    (request as any).userId = (decoded as any).sub;
    (request as any).userEmail = (decoded as any).email;
  } catch (err) {
    logger.warn({ error: (err as Error).message }, 'Auth failed');
    reply.status(401).send({ error: 'Unauthorized', statusCode: 401 });
  }
}
```

---

## Lessons Learned

### Anti-Patterns to Avoid:

1. **❌ NEVER use query strings for sensitive identifiers**
   - Query strings are logged, cached, and visible in URLs
   - Use JWT tokens or session cookies instead

2. **❌ NEVER trust user-provided identifiers**
   - `?userId=...` can be manipulated by anyone
   - Extract identity from cryptographically signed tokens

3. **❌ NEVER implement financial/PII endpoints without auth**
   - Profit data is sensitive competitive intelligence
   - Always require authentication for financial data

### Best Practices Applied:

1. **✅ Defense in Depth**
   - Auth middleware (JWT verification)
   - Rate limiting (abuse prevention)
   - Ownership checks (authorization layer)

2. **✅ Principle of Least Privilege**
   - Users can ONLY access their own data
   - No admin backdoors for bypassing auth

3. **✅ Fail-Safe Defaults**
   - Missing JWT = 401 Unauthorized
   - Invalid offer ownership = 403 Forbidden
   - Rate limit exceeded = 429 Too Many Requests

---

## Next Steps (Future Improvements)

1. **Audit Logging** (Optional):
   - Log all profit API access with userId + timestamp
   - Detect suspicious access patterns

2. **IP-Based Rate Limiting** (Optional):
   - Add secondary rate limit by IP (100/min)
   - Prevents token farming attacks

3. **Data Encryption at Rest** (Future):
   - Encrypt profit_sales.net_profit field in database
   - Decrypt only when accessed by authenticated user

4. **Automated Security Testing** (Future):
   - Add API auth tests to CI/CD pipeline
   - Fail build if endpoints lack auth middleware

---

## Deployment

**Status**: ✅ Deployed to master branch
**Commit**: `595151b0`
**Remote**: `origin/master`

```bash
git log -1 --oneline
# 595151b0 security: add JWT authentication and rate limiting to profit API

git show 595151b0 --stat
# backend/src/api/routes/profits.ts     | 126 ++++++++++++++++++++++---
# web/lib/api-client.ts                 |  50 ++++------
# web/app/dashboard/profits/page.tsx    |  10 +-
# backend/test-profit-auth.sh           |  95 +++++++++++++++++++
# 4 files changed, 181 insertions(+), 55 deletions(-)
```

---

## Conclusion

**Critical security vulnerability FIXED.**

Before: Anyone could query any user's profit data.
After: Only authenticated users can access their own data, with rate limiting.

**Impact**:
- Prevents privacy violation
- Prevents competitive intelligence leakage
- Adds abuse prevention via rate limiting
- Ensures GDPR/privacy compliance

**Co-Authored-By**: Claude Sonnet 4.5 <noreply@anthropic.com>
