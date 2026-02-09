# JakeBuysIt Architecture

Technical reference for agents doing implementation work on the JakeBuysIt platform.

---

## System Overview

```
                                 +-----------+
                                 |  Frontend |  (Next.js 16)
                                 |  :3000    |
                                 +-----+-----+
                                       |
                                       | HTTP / WebSocket
                                       v
+----------+     HTTP     +-------------------+     HTTP     +----------+
| Admin    | -----------> |    Backend API    | -----------> | Agent 2  |
| :3001    |              |    (Fastify)      |              | (FastAPI)|
| Next.js  |              |    :8080          |              | :8000    |
+----------+              +--------+----------+              +----------+
                               |       |                   AI Vision &
                               |       |                   Marketplace &
                               |       |                   Pricing
                          +----+       +----+
                          v                 v
                    +-----------+    +-----------+     HTTP     +----------+
                    | PostgreSQL|    |   Redis   | <---------- | Agent 3  |
                    | :5432     |    |   :6379   |             | (Node)   |
                    +-----------+    +-----------+             | :3002    |
                                                               +----------+
                                                             Jake Voice &
                                                             Character
```

| Service | Tech | Port | Purpose |
|---------|------|------|---------|
| **Frontend** (Agent 1) | Next.js 16, React 19, Tailwind, Rive | 3000 | Customer-facing web app |
| **AI Engine** (Agent 2) | Python, FastAPI | 8000 | Vision identification, marketplace research, pricing |
| **Jake Service** (Agent 3) | Node.js, TypeScript | 3002 | Script generation, voice synthesis, animation state |
| **Backend API** (Agent 4) | Node.js, Fastify, BullMQ | 8080 | Orchestrator, auth, API gateway, job queue |
| **Admin** (Agent 5) | Next.js 16 | 3001 | Operations dashboard (mostly stubs) |
| **PostgreSQL** | PostgreSQL 16 Alpine | 5432 | Primary data store (11 tables) |
| **Redis** | Redis 7 Alpine | 6379 | Cache, BullMQ job queues, rate limiting, refresh tokens |

---

## Offer Pipeline

The core business flow. Each stage is a BullMQ job that calls the orchestrator on completion, which queues the next stage.

```
User uploads photos
       |
       v
  [1] UPLOADED ---- offerOrchestrator.createOffer()
       |              Creates offer record, queues vision-identify job
       v
  [2] VISION ------- processVisionJob → onVisionComplete()
       |              Agent 2: POST /api/v1/identify
       |              Stores: category, brand, model, condition, confidence
       |              Escalates if confidence < 50
       v
  [3] MARKETPLACE -- processMarketplaceJob → onMarketplaceComplete()
       |              Agent 2: POST /api/v1/research
       |              Stores: market_data (eBay sold listings, stats)
       |              Escalates if comparable count < 3
       v
  [4] PRICING ------ processPricingJob → onPricingComplete()
       |              Agent 2: POST /api/v1/price
       |              Stores: fmv, offer_amount, condition_multiplier, category_margin
       |              Escalates if offer > $500 or daily spending limit exceeded
       v
  [5] JAKE-VOICE --- processJakeVoiceJob → onJakeVoiceComplete()
       |              Agent 3: POST /api/v1/generate-script + /generate-voice
       |              Stores: jake_script, jake_voice_url, jake_animation_state, jake_tier
       v
  [6] READY -------- Offer presented to user
       |
       +---> ACCEPTED (triggers shipping flow)
       +---> DECLINED
       +---> EXPIRED (auto-expiry after 24h, checked every 15min)
```

### Escalation Triggers

| Trigger | Threshold | Where |
|---------|-----------|-------|
| Low vision confidence | `< 50%` | `onVisionComplete()` |
| Few comparables | `< 3 listings` | `onMarketplaceComplete()` |
| High value offer | `> $500` | `onPricingComplete()` |
| Daily spending limit | `> maxOfferAmount * 10` | `onPricingComplete()` |
| Pipeline error | Any unhandled error | `fail()` |

Escalated offers stay in `processing` status with `escalated = true`. A notification job is queued for admin.

### BullMQ Queue Configuration

| Queue | Concurrency | Retry | Backoff |
|-------|-------------|-------|---------|
| `vision-identify` | 10 | 2 attempts | Exponential, 3s |
| `marketplace-research` | 20 | 2 attempts | Exponential, 3s |
| `pricing-calculate` | 50 | 2 attempts | Exponential, 2s |
| `jake-voice` | 10 | 2 attempts | Exponential, 2s |
| `notifications` | 100 | default | default |

---

## Database Schema

PostgreSQL 16 with `uuid-ossp` and `pgcrypto` extensions. All IDs are UUID v4. Timestamps are `TIMESTAMPTZ`.

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| **users** | User accounts | `email`, `password_hash` (bcrypt via pgcrypto), `trust_score` (0-100), `jake_familiarity` (new/returning/regular/vip), `jake_bucks_balance`, `payout_preferred`, `risk_flags` (JSONB) |
| **offers** | Core offer records | `status` (state machine), `item_*` fields, `ai_*` fields, `fmv`, `offer_amount`, `jake_*` fields, `escalated`, `expires_at` |
| **shipments** | Shipping tracking | `carrier`, `tracking_number`, `status`, `address` (JSONB), `status_history` (JSONB) |
| **verifications** | Warehouse item verification | `condition_match`, `condition_actual`, `approved`, `revised_offer`, `photos_at_receipt` (JSONB) |
| **payouts** | Payment records | `amount`, `method` (paypal/venmo/zelle/bank/jake_bucks), `status`, `transaction_ref`, `fee`, `net_amount` |
| **jake_bucks_transactions** | Virtual currency ledger | `type` (earned/redeemed/expired/bonus), `amount`, `balance_after`, `reference_type`, `reference_id` |
| **fraud_checks** | Fraud detection results | `check_type` (stock_photo/reverse_image/device_fingerprint), `result` (pass/flag/fail), `action_taken` |
| **audit_log** | Change tracking | `entity_type`, `entity_id`, `action`, `actor_type`, `before`/`after` (JSONB), `ip_address` |
| **config** | Runtime configuration | `key` (text PK), `value` (JSONB) |

### Offer Status State Machine

```
processing --> ready --> accepted --> shipped --> received --> verified --> paid
                  |                                              |
                  +--> declined                                  +--> disputed
                  +--> expired
                                                    rejected
                                                    cancelled
```

### Config Table Default Values

Three rows inserted at schema creation:

**`pricing_rules`:**
- Category margins: Consumer Electronics 60%, Phones 65%, Clothing 45%, Collectibles 50%, Books 35%, Appliances 50%, Tools 55%, Gaming 60%
- Condition multipliers: New 1.0, Like New 0.925, Good 0.80, Fair 0.625, Poor 0.40
- `min_offer`: $5, `daily_spending_limit`: $10,000, `offer_expiry_hours`: 24

**`confidence_thresholds`:**
- `auto_price_threshold`: 80, `flag_threshold`: 60, `auto_escalate_threshold`: 60, `high_value_escalate_above`: $500

**`fraud_settings`:**
- `stock_photo_threshold`: 0.80, `reverse_image_match_threshold`: 0.75
- `user_velocity_max_per_day`: 10, `new_account_max_offer`: $100, `new_account_days`: 30
- `high_value_id_required_above`: $200

---

## API Surface

### Backend (Agent 4) — Port 8080

| Method | Path | Auth | Status | Description |
|--------|------|------|--------|-------------|
| GET | `/health` | None | Done | DB + Redis connectivity check |
| POST | `/api/v1/auth/register` | None | Done | Email/password registration |
| POST | `/api/v1/auth/login` | None | Done | Email/password login |
| POST | `/api/v1/auth/refresh` | None | Done | Rotate refresh token |
| POST | `/api/v1/offers` | Optional | Done | Create offer (start pipeline) |
| GET | `/api/v1/offers/:id` | None | Done | Get offer with processing stage |
| GET | `/api/v1/offers` | Required | Done | List user's offers (paginated) |
| GET | `/api/v1/offers/recent` | None | Done | Recent offers ticker (cached 5min) |
| POST | `/api/v1/offers/:id/accept` | Required | Done | Accept offer |
| POST | `/api/v1/offers/:id/decline` | None | Done | Decline offer |
| POST | `/api/v1/uploads/photos` | Optional | Done | Upload up to 6 photos to S3 |
| GET | `/api/v1/users/*` | - | Stub | User profile endpoints |
| GET | `/api/v1/shipments/*` | - | Stub | Shipping endpoints |
| GET | `/webhooks/*` | - | Stub | Payment/shipping webhooks |
| GET | `/api/v1/admin/*` | - | Stub | Admin operations |

### Agent 2 (AI Engine) — Port 8000

| Method | Path | Description | Typical Latency |
|--------|------|-------------|-----------------|
| GET | `/health` | Health check | <100ms |
| POST | `/api/v1/identify` | Vision item identification | 3-8s |
| POST | `/api/v1/research` | Marketplace price research | 5-15s |
| POST | `/api/v1/price` | FMV calculation + offer | <1s |

All endpoints have a 30s timeout. See `INTEGRATION.md` for full request/response contracts.

### Agent 3 (Jake Service) — Port 3002

| Method | Path | Description | Status |
|--------|------|-------------|--------|
| GET | `/api/v1/health` | Health check | Done |
| POST | `/api/v1/generate-script` | Generate Jake script for scenario | Partial |
| POST | `/api/v1/generate-voice` | Synthesize voice audio from script | Partial |
| POST | `/api/v1/jake/research-choreography` | 3-stage research animation data | Partial |

---

## Infrastructure

### Docker Compose Services

All services connected via `jakebuysit-network` bridge network.

| Container | Image | Volumes | Health Check |
|-----------|-------|---------|-------------|
| `jakebuysit-backend` | Custom (Dockerfile in `backend/`) | None | `wget http://localhost:8080/health` |
| `jakebuysit-pricing-api` | Custom (Dockerfile in root) | None | `curl http://localhost:8000/health` |
| `jakebuysit-jake` | Custom (Dockerfile in `services/jake/`) | None | `wget http://localhost:3002/api/v1/health` |
| `jakebuysit-web` | Custom (Dockerfile in `web/`) | None | None |
| `jakebuysit-admin` | Custom (Dockerfile in `admin/`) | None | None |
| `jakebuysit-postgres` | `postgres:16-alpine` | `postgres-data`, schema.sql auto-init | `pg_isready` |
| `jakebuysit-redis` | `redis:7-alpine` | `redis-data`, AOF persistence | `redis-cli ping` |

### Redis Usage

Redis serves four distinct purposes:

| Purpose | Key Pattern | TTL | Example |
|---------|-------------|-----|---------|
| **Object cache** | `user:{id}`, `offer:{id}`, `market:{hash}` | 2-360min | Offer response cache (2min) |
| **BullMQ job queues** | `bull:{queueName}:*` | Managed by BullMQ | vision-identify, marketplace-research, etc. |
| **Rate limiting** | `rate:user:{id}:{window}`, `rate:ip:{ip}:{window}` | Window duration | 5 offers/hour per user |
| **Auth tokens** | `refresh:{token}` | 7 days | Refresh token rotation |
| **Pipeline stage** | `offer:{id}:stage` | 10min | Current processing stage for polling |
| **Spending limits** | `spending:daily:{date}` | 24h | Daily spending cap tracking |

---

## Integration Points

### Backend → Agent 2 (HTTP Client)

**File:** `backend/src/integrations/agent2-client.ts`

The backend calls Agent 2's FastAPI service via HTTP POST. Three methods:

```
agent2.identify(photoUrls, userDescription?)  → VisionResult
agent2.research(brand, model, category, condition?)  → MarketplaceResult
agent2.price(marketplaceStats, category, condition)  → PricingResult
```

- Timeout: 30s per request
- On timeout/error: throws, caught by BullMQ worker which retries (2 attempts)
- Base URL: `config.agents.agent2Url` (default `http://localhost:8000`)

### Backend → Agent 3 (HTTP Client)

**File:** `backend/src/integrations/agent3-client.ts`

```
agent3.generateScript(request)  → ScriptResult
agent3.generateVoice(script, tone)  → VoiceResult
```

- Timeout: 15s per request
- Base URL: `config.agents.agent3Url` (default `http://localhost:3002`)

### Frontend → Backend

- All API calls to `http://backend:8080` (Docker) or `NEXT_PUBLIC_API_URL`
- Auth via Bearer token in Authorization header
- Frontend polls `GET /offers/:id` to track pipeline progress (via `processingStage` field)

### BullMQ Job Chain

Each BullMQ worker calls the corresponding integration client, then calls the orchestrator's completion handler, which queues the next job. The circular dependency between `workers.ts` and `offer-orchestrator.ts` is safe because all references are runtime function calls, not import-time dependencies.

```
workers.ts (processVisionJob) → agent2.identify() → offerOrchestrator.onVisionComplete()
                                                          → addJob('marketplace-research')
```

---

## Key Files

| Concept | File | Lines |
|---------|------|-------|
| Offer pipeline orchestrator | `backend/src/services/offer-orchestrator.ts` | ~300 |
| Offers API routes | `backend/src/api/routes/offers.ts` | ~305 |
| Auth API routes | `backend/src/api/routes/auth.ts` | ~138 |
| Photo upload routes | `backend/src/api/routes/uploads.ts` | ~88 |
| Zod validation schemas | `backend/src/api/schemas.ts` | ~90 |
| Auth middleware (JWT) | `backend/src/api/middleware/auth.ts` | ~37 |
| DB client (ORM-lite) | `backend/src/db/client.ts` | ~170 |
| Redis cache utilities | `backend/src/db/redis.ts` | ~93 |
| BullMQ queue setup | `backend/src/queue/workers.ts` | ~100 |
| Agent 2 HTTP client | `backend/src/integrations/agent2-client.ts` | ~111 |
| Agent 3 HTTP client | `backend/src/integrations/agent3-client.ts` | ~79 |
| Server entry point | `backend/src/index.ts` | ~170 |
| Config (env vars) | `backend/src/config.ts` | ~81 |
| DB schema (SQL) | `backend/src/db/schema.sql` | ~317 |
| Docker Compose | `docker-compose.yml` | ~186 |
| Jake character bible | `services/jake/core/character-bible.ts` | ~180 |
| Jake type definitions | `types/jake.ts` | ~147 |
| Jake API routes | `services/jake/api/routes.ts` | ~20 (partial) |
| Integration contract | `INTEGRATION.md` | ~300 |
| Agent prompts | `agent-prompts/AGENT-{1-5}-*.md` | 400+ each |

---

## Configuration

### Required Environment Variables

| Variable | Used By | Description |
|----------|---------|-------------|
| `DATABASE_URL` | Backend, Agent 2 | PostgreSQL connection string |
| `JWT_SECRET` | Backend | JWT signing secret |
| `JWT_REFRESH_SECRET` | Backend | Refresh token signing secret |
| `REDIS_URL` | Backend, Agent 2 | Redis connection string |
| `ANTHROPIC_API_KEY` | Agent 2, Agent 3 | Claude API for vision + script generation |

### Optional Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 8080 | Backend server port |
| `NODE_ENV` | development | Environment mode |
| `JWT_EXPIRES_IN` | 15m | Access token lifetime |
| `JWT_REFRESH_EXPIRES_IN` | 7d | Refresh token lifetime |
| `AWS_REGION` | us-east-1 | S3 region |
| `AWS_ACCESS_KEY_ID` | - | S3 credentials |
| `AWS_SECRET_ACCESS_KEY` | - | S3 credentials |
| `S3_BUCKET` | jakebuysit-photos | Photo storage bucket |
| `S3_CDN_URL` | - | CloudFront CDN URL |
| `AGENT2_API_URL` | http://localhost:8000 | Agent 2 base URL |
| `AGENT3_API_URL` | http://localhost:3002 | Agent 3 base URL |
| `EBAY_APP_ID` | - | eBay API credentials |
| `ELEVENLABS_API_KEY` | - | Voice synthesis API |
| `EASYPOST_API_KEY` | - | Shipping label API |
| `STRIPE_SECRET_KEY` | - | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | - | Stripe webhook verification |
| `PAYPAL_CLIENT_ID` | - | PayPal payments |
| `TELEGRAM_BOT_TOKEN` | - | Admin notifications |
| `SENTRY_DSN` | - | Error monitoring |
| `LOG_LEVEL` | info | Logging verbosity |
| `OFFERS_PER_DAY_LIMIT` | 20 | Rate limit per user |
| `OFFERS_PER_HOUR_LIMIT` | 5 | Rate limit per user |
| `MIN_OFFER_AMOUNT` | 5 | Floor for any offer |
| `MAX_OFFER_AMOUNT` | 2000 | Ceiling for any offer |
| `OFFER_EXPIRY_HOURS` | 24 | Hours before offer expires |

---

## Security

### Authentication Flow

1. **Register/Login** returns a JWT access token (15min) and a refresh token (UUID, stored in Redis with 7-day TTL)
2. **Access token** is a signed JWT with `{ sub: userId, email }` payload, verified via `@fastify/jwt`
3. **Refresh token rotation**: old token is deleted from Redis, new pair issued. Prevents replay.
4. **Password hashing**: bcrypt via `pgcrypto` extension (`crypt($password, gen_salt('bf', 10))`)
5. Two middleware modes: `requireAuth` (401 if no token) and `optionalAuth` (proceeds as anonymous if no token)

### Input Validation

- All request bodies validated with **Zod schemas** (`backend/src/api/schemas.ts`)
- `validateBody()`, `validateParams()`, `validateQuery()` throw 400 with field-level errors
- Photo URLs validated as proper URLs, max 6 per request
- UUID params validated via `z.string().uuid()`

### SQL Injection Prevention

- **Table name allowlist**: `ALLOWED_TABLES` set in `db/client.ts` — only 9 tables permitted
- **Column name regex**: `/^[a-z_][a-z0-9_]*$/i` — no special characters
- **Parameterized queries**: all values passed as `$1`, `$2`, etc.

### Rate Limiting

- Global: 100 requests/minute via `@fastify/rate-limit`
- Offer creation: 5/hour per user (or per IP for anonymous)
- Rate counters stored in Redis with TTL-based expiry

### Error Handling

- 4xx errors: actual error message returned to client
- 5xx errors: generic "Internal Server Error" returned (no stack traces or internals leaked)
- All errors logged with request context via Pino logger
- CORS restricted to `jakebuysit.com` and `admin.jakebuysit.com` in production
