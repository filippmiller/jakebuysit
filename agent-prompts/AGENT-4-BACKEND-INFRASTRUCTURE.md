# AGENT 4: Backend API & Infrastructure

## MISSION
Build the core backend API, database, authentication, shipping, payments, and orchestration layer that connects all services together. This is the central nervous system of JakeBuysIt.

## CONTEXT
You are building the production backend that:
1. **Receives** photo submissions from frontend
2. **Orchestrates** AI vision, marketplace research, pricing (Agent 2)
3. **Triggers** Jake voice/animation generation (Agent 3)
4. **Manages** user accounts, offers, shipments, payouts
5. **Integrates** shipping (USPS), payments (Stripe/PayPal), storage (S3)
6. **Provides** real-time updates via WebSocket
7. **Enforces** fraud detection, rate limits, business rules

## TECHNOLOGY STACK
- **API Framework**: Node.js Fastify (fast, low overhead) OR Python FastAPI
- **Database**: PostgreSQL 16+ (ACID, JSONB, full-text search)
- **Cache**: Redis 7+ (sessions, rate limits, queue)
- **Queue**: BullMQ (async AI jobs, notifications)
- **Storage**: AWS S3 (photos, labels, voice files)
- **Auth**: JWT with refresh tokens, OAuth2 (Google, Apple)
- **Payments**: Stripe Connect, PayPal Payouts API
- **Shipping**: EasyPost or Shippo (USPS label generation)
- **WebSocket**: Socket.io or native WebSocket
- **Monitoring**: Datadog / Prometheus, Sentry for errors

## DATABASE SCHEMA

### Core Tables

```sql
-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  name TEXT,
  auth_provider TEXT, -- 'email', 'google', 'apple'
  auth_provider_id TEXT,
  password_hash TEXT, -- null if OAuth
  verified BOOLEAN DEFAULT false,
  trust_score FLOAT DEFAULT 50, -- 0-100
  risk_flags JSONB DEFAULT '[]',
  payout_preferred TEXT, -- 'paypal', 'venmo', 'zelle', 'bank', 'jake_bucks'
  payout_details_encrypted TEXT, -- tokenized
  jake_bucks_balance DECIMAL(10,2) DEFAULT 0,
  jake_familiarity TEXT DEFAULT 'new', -- 'new', 'returning', 'regular', 'vip'
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Offers
CREATE TABLE offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  status TEXT NOT NULL, -- 'processing', 'ready', 'accepted', 'declined', 'expired', 'shipped', 'received', 'verified', 'paid', 'disputed', 'rejected', 'cancelled'

  -- Item identification
  item_category TEXT,
  item_subcategory TEXT,
  item_brand TEXT,
  item_model TEXT,
  item_condition TEXT, -- 'New', 'Like New', 'Good', 'Fair', 'Poor'
  item_features JSONB,
  item_damage JSONB,
  photos JSONB NOT NULL, -- [{ url, thumbnail_url, uploaded_at }]
  user_description TEXT,

  -- AI analysis
  ai_identification JSONB, -- full vision output
  ai_confidence FLOAT,
  ai_model_used TEXT,

  -- Marketplace data
  market_data JSONB, -- { ebay: {...}, amazon: {...}, ... }
  fmv DECIMAL(10,2), -- fair market value
  fmv_confidence FLOAT,

  -- Pricing
  condition_multiplier FLOAT,
  category_margin FLOAT,
  dynamic_adjustments JSONB, -- { velocity: 1.05, inventory: 0.95, ... }
  offer_amount DECIMAL(10,2) NOT NULL,
  offer_to_market_ratio FLOAT,

  -- Jake personality
  jake_voice_url TEXT,
  jake_script TEXT,
  jake_animation_state TEXT,
  jake_tier INTEGER, -- 1, 2, or 3

  -- Escalation
  escalated BOOLEAN DEFAULT false,
  escalation_reason TEXT,
  escalation_notes JSONB,
  reviewer_id UUID,
  reviewed_at TIMESTAMPTZ,

  -- Expiry
  expires_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  accepted_at TIMESTAMPTZ,

  INDEX (user_id, status),
  INDEX (status, created_at),
  INDEX (escalated, created_at)
);

-- Shipments
CREATE TABLE shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id),
  user_id UUID REFERENCES users(id),

  -- Shipping details
  carrier TEXT DEFAULT 'USPS',
  service TEXT, -- 'Priority', 'First Class', etc.
  tracking_number TEXT UNIQUE,
  label_url TEXT,
  label_cost DECIMAL(10,2),

  -- Address
  address JSONB NOT NULL, -- { name, street, city, state, zip }

  -- Status
  status TEXT, -- 'label_created', 'in_transit', 'delivered', 'exception'
  status_history JSONB DEFAULT '[]',

  -- Tracking
  estimated_delivery TIMESTAMPTZ,
  actual_delivery TIMESTAMPTZ,
  last_tracking_update TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX (tracking_number),
  INDEX (status, estimated_delivery)
);

-- Verifications (at warehouse)
CREATE TABLE verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  offer_id UUID REFERENCES offers(id),
  shipment_id UUID REFERENCES shipments(id),

  -- Verification
  verified_by UUID, -- staff member
  condition_match BOOLEAN,
  condition_actual TEXT,
  photos_at_receipt JSONB,
  weight_submitted FLOAT,
  weight_actual FLOAT,
  serial_number TEXT,

  -- Outcome
  approved BOOLEAN,
  revised_offer DECIMAL(10,2),
  revision_reason TEXT,
  notes TEXT,

  verified_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payouts
CREATE TABLE payouts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  offer_id UUID REFERENCES offers(id),

  -- Amount
  amount DECIMAL(10,2) NOT NULL,
  currency TEXT DEFAULT 'USD',

  -- Method
  method TEXT NOT NULL, -- 'paypal', 'venmo', 'zelle', 'bank', 'jake_bucks'
  method_details JSONB, -- { email, phone, account_number (tokenized) }

  -- Status
  status TEXT, -- 'pending', 'processing', 'completed', 'failed'
  transaction_ref TEXT, -- external ID from payment provider
  failure_reason TEXT,

  -- Fees
  fee DECIMAL(10,2),
  net_amount DECIMAL(10,2),

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  INDEX (user_id, status),
  INDEX (status, created_at)
);

-- Jake Bucks Transactions
CREATE TABLE jake_bucks_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),

  type TEXT, -- 'earned', 'redeemed', 'expired', 'bonus'
  amount DECIMAL(10,2),
  balance_after DECIMAL(10,2),

  -- Reference
  reference_type TEXT, -- 'offer', 'bonus', 'redemption'
  reference_id UUID,
  description TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX (user_id, created_at)
);

-- Fraud Detection
CREATE TABLE fraud_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  offer_id UUID REFERENCES offers(id),

  -- Checks
  check_type TEXT, -- 'stock_photo', 'reverse_image', 'device_fingerprint', etc.
  result TEXT, -- 'pass', 'flag', 'fail'
  confidence FLOAT,
  details JSONB,

  -- Action
  action_taken TEXT, -- 'none', 'flag', 'escalate', 'reject'

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX (user_id),
  INDEX (offer_id)
);

-- Audit Log
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Entity
  entity_type TEXT, -- 'offer', 'user', 'payout', etc.
  entity_id UUID,

  -- Action
  action TEXT, -- 'created', 'updated', 'deleted', 'state_change'
  actor_type TEXT, -- 'user', 'admin', 'system'
  actor_id UUID,

  -- Changes
  before JSONB,
  after JSONB,

  -- Context
  ip_address INET,
  user_agent TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  INDEX (entity_type, entity_id),
  INDEX (created_at)
);

-- Configuration
CREATE TABLE config (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_by UUID,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

## API ENDPOINTS

### Authentication

```typescript
POST /api/v1/auth/register
Body: { email, password, name }
Returns: { userId, accessToken, refreshToken }

POST /api/v1/auth/login
Body: { email, password }
Returns: { userId, accessToken, refreshToken }

POST /api/v1/auth/oauth/google
Body: { idToken }
Returns: { userId, accessToken, refreshToken }

POST /api/v1/auth/oauth/apple
Body: { authorizationCode }
Returns: { userId, accessToken, refreshToken }

POST /api/v1/auth/refresh
Body: { refreshToken }
Returns: { accessToken }

POST /api/v1/auth/logout
Headers: { Authorization: Bearer {token} }
```

### Offers

```typescript
POST /api/v1/offers/create
Headers: { Authorization: Bearer {token} } // optional for anonymous
Body: {
  photos: File[], // multipart/form-data
  description?: string
}
Returns: {
  offerId: string,
  status: 'processing',
  estimatedCompletion: number // seconds
}

GET /api/v1/offers/:id
Returns: {
  offer: {...}, // full offer object
  jake: { voiceUrl, script, animationState },
  market: { fmv, sources, confidence }
}

WS /api/v1/offers/:id/stream
Receives: {
  stage: 'looking' | 'researching' | 'deciding',
  progress: number, // 0-100
  data: {...},
  jakeMessage?: string
}

POST /api/v1/offers/:id/accept
Headers: { Authorization: Bearer {token} }
Body: {
  email?, // if not logged in
  name?,
  payoutMethod: string,
  payoutDetails: {...},
  address: {...}
}
Returns: {
  shipmentId: string,
  labelUrl: string,
  trackingNumber: string
}

POST /api/v1/offers/:id/decline
Headers: { Authorization: Bearer {token} }
Returns: { success: true }

POST /api/v1/offers/:id/dispute
Headers: { Authorization: Bearer {token} }
Body: { reason: string }
Returns: { disputeId: string }
```

### User

```typescript
GET /api/v1/users/me
Headers: { Authorization: Bearer {token} }
Returns: { user: {...}, jakeBucks: number, trustScore: number }

GET /api/v1/users/me/dashboard
Returns: {
  activeOffers: [],
  shipments: [],
  payouts: [],
  jakeBucks: number,
  jakeGreeting: { voiceUrl, script }
}

PUT /api/v1/users/me/payout-method
Body: { method: string, details: {...} }
Returns: { success: true }

GET /api/v1/users/me/history
Query: { page, limit }
Returns: { offers: [], total: number }
```

### Shipments

```typescript
GET /api/v1/shipments/:id
Returns: {
  shipment: {...},
  tracking: { status, updates: [], estimatedDelivery }
}

POST /api/v1/shipments/:id/schedule-pickup
Body: { date: string }
Returns: { confirmationNumber: string }
```

### Webhooks

```typescript
POST /webhooks/shipping/:provider
Body: { /* EasyPost/Shippo webhook payload */ }
// Processes tracking updates

POST /webhooks/payment/:provider
Body: { /* Stripe/PayPal webhook payload */ }
// Processes payout confirmations
```

## CORE SERVICES

### 1. Offer Orchestrator (`services/orchestrator.ts`)

Coordinates the entire offer flow:

```typescript
async createOffer(photos: File[], description?: string, userId?: string) {
  // 1. Upload photos to S3
  const photoUrls = await uploadPhotos(photos);

  // 2. Create offer record (status: 'processing')
  const offer = await db.offers.create({
    photos: photoUrls,
    user_description: description,
    user_id: userId,
    status: 'processing'
  });

  // 3. Enqueue AI job (calls Agent 2)
  await queue.add('vision-identify', { offerId: offer.id, photoUrls });

  // 4. Return immediately
  return { offerId: offer.id, status: 'processing' };
}

// Worker processes job
async processVisionJob(offerId: string, photoUrls: string[]) {
  // Call Agent 2: Vision identification
  const identification = await agent2.identify(photoUrls);

  // Update offer
  await db.offers.update(offerId, {
    ai_identification: identification,
    ai_confidence: identification.confidence,
    item_category: identification.category,
    // ...
  });

  // Check confidence threshold
  if (identification.confidence < 60) {
    await escalate(offerId, 'low_confidence');
    return;
  }

  // Enqueue marketplace research
  await queue.add('marketplace-research', { offerId });
}

async processMarketplaceJob(offerId: string) {
  const offer = await db.offers.findById(offerId);

  // Call Agent 2: Marketplace research
  const marketData = await agent2.research(offer.ai_identification);

  // Update offer
  await db.offers.update(offerId, {
    market_data: marketData,
    fmv: marketData.fmv,
    fmv_confidence: marketData.confidence
  });

  // Enqueue pricing
  await queue.add('pricing-calculate', { offerId });
}

async processPricingJob(offerId: string) {
  const offer = await db.offers.findById(offerId);

  // Call Agent 2: Calculate offer
  const pricing = await agent2.calculateOffer(offer);

  // Update offer
  await db.offers.update(offerId, {
    offer_amount: pricing.offer,
    condition_multiplier: pricing.multipliers.condition,
    category_margin: pricing.multipliers.margin,
    dynamic_adjustments: pricing.adjustments
  });

  // Enqueue Jake voice generation
  await queue.add('jake-voice', { offerId });
}

async processJakeVoiceJob(offerId: string) {
  const offer = await db.offers.findById(offerId);

  // Call Agent 3: Generate Jake script + voice
  const jake = await agent3.generateOffer(offer);

  // Update offer
  await db.offers.update(offerId, {
    jake_voice_url: jake.audioUrl,
    jake_script: jake.script,
    jake_animation_state: jake.animationState,
    status: 'ready',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24h
  });

  // Notify user
  await notifications.send(offer.user_id, 'offer_ready', { offerId: offer.id });

  // Send WebSocket update
  await websocket.emit(`offer:${offerId}`, { status: 'ready' });
}
```

### 2. Shipping Service (`services/shipping.ts`)

```typescript
async generateLabel(offerId: string, address: Address) {
  const offer = await db.offers.findById(offerId);

  // Estimate weight/dimensions by category
  const packageSpecs = getPackageSpecs(offer.item_category);

  // Create shipment via EasyPost
  const shipment = await easypost.shipments.create({
    to_address: address,
    from_address: WAREHOUSE_ADDRESS,
    parcel: packageSpecs,
    carrier: 'USPS',
    service: 'Priority' // or 'FirstClass' for <1lb
  });

  // Buy label
  const label = await easypost.shipments.buy(shipment.id, {
    rate: shipment.lowestRate(['USPS'])
  });

  // Store in DB
  await db.shipments.create({
    offer_id: offerId,
    user_id: offer.user_id,
    tracking_number: label.tracking_code,
    label_url: label.postage_label.label_url,
    label_cost: label.selected_rate.rate,
    address,
    status: 'label_created'
  });

  // Update offer status
  await db.offers.update(offerId, { status: 'shipped' });

  return {
    labelUrl: label.postage_label.label_url,
    trackingNumber: label.tracking_code
  };
}

async handleTrackingWebhook(payload: any) {
  const trackingNumber = payload.tracking_code;
  const status = payload.status;

  // Update shipment
  await db.shipments.update({ tracking_number: trackingNumber }, {
    status: mapStatus(status),
    last_tracking_update: new Date(),
    status_history: append(payload)
  });

  // If delivered, trigger verification
  if (status === 'delivered') {
    const shipment = await db.shipments.findByTracking(trackingNumber);
    await notifications.sendToWarehouse('verify_item', { shipmentId: shipment.id });
  }
}
```

### 3. Payment Service (`services/payments.ts`)

```typescript
async processPayout(offerId: string) {
  const offer = await db.offers.findById(offerId);
  const user = await db.users.findById(offer.user_id);

  if (user.payout_preferred === 'jake_bucks') {
    // Store credit (instant, no fees)
    await processJakeBucksCredit(offer);
  } else {
    // External payout
    await processExternalPayout(offer, user);
  }
}

async processJakeBucksCredit(offer: Offer) {
  // Add bonus (10-15%)
  const bonus = offer.offer_amount * 0.12;
  const total = offer.offer_amount + bonus;

  // Update user balance
  await db.users.increment(offer.user_id, 'jake_bucks_balance', total);

  // Record transaction
  await db.jake_bucks_transactions.create({
    user_id: offer.user_id,
    type: 'earned',
    amount: total,
    reference_type: 'offer',
    reference_id: offer.id,
    description: `${offer.item_brand} ${offer.item_model} + 12% bonus`
  });

  // Update offer
  await db.offers.update(offer.id, { status: 'paid' });

  // Notify
  await notifications.send(offer.user_id, 'payout_complete_jake_bucks', { amount: total });
}

async processExternalPayout(offer: Offer, user: User) {
  // Create payout record
  const payout = await db.payouts.create({
    user_id: user.id,
    offer_id: offer.id,
    amount: offer.offer_amount,
    method: user.payout_preferred,
    status: 'pending'
  });

  try {
    let result;

    switch (user.payout_preferred) {
      case 'paypal':
        result = await paypal.payouts.create({
          email: user.payout_details.email,
          amount: offer.offer_amount,
          currency: 'USD'
        });
        break;

      case 'venmo':
        result = await venmo.send({
          phone: user.payout_details.phone,
          amount: offer.offer_amount
        });
        break;

      case 'zelle':
        result = await zelle.send({
          email: user.payout_details.email,
          amount: offer.offer_amount
        });
        break;

      case 'bank':
        result = await stripe.transfers.create({
          destination: user.payout_details.stripe_account_id,
          amount: offer.offer_amount * 100, // cents
          currency: 'usd'
        });
        break;
    }

    // Update payout
    await db.payouts.update(payout.id, {
      status: 'completed',
      transaction_ref: result.id,
      completed_at: new Date()
    });

    // Update offer
    await db.offers.update(offer.id, { status: 'paid' });

    // Notify
    await notifications.send(user.id, 'payout_sent', { amount: offer.offer_amount, method: user.payout_preferred });

  } catch (error) {
    await db.payouts.update(payout.id, {
      status: 'failed',
      failure_reason: error.message
    });

    // Alert admin
    await notifications.sendToAdmin('payout_failed', { payoutId: payout.id, error });
  }
}
```

### 4. Fraud Detection (`services/fraud.ts`)

```typescript
async checkFraud(offerId: string, userId: string, photos: string[]) {
  const checks = [];

  // 1. Stock photo detection
  const stockPhotoCheck = await detectStockPhotos(photos);
  checks.push(stockPhotoCheck);

  // 2. Reverse image search
  const reverseImageCheck = await reverseImageSearch(photos);
  checks.push(reverseImageCheck);

  // 3. EXIF data analysis
  const exifCheck = await analyzeEXIF(photos);
  checks.push(exifCheck);

  // 4. User velocity check
  const velocityCheck = await checkVelocity(userId);
  checks.push(velocityCheck);

  // 5. Device fingerprint
  const deviceCheck = await checkDeviceReputation(userId);
  checks.push(deviceCheck);

  // Store all checks
  await db.fraud_checks.bulkCreate(checks.map(c => ({
    user_id: userId,
    offer_id: offerId,
    ...c
  })));

  // Evaluate
  const highRisk = checks.some(c => c.result === 'fail');
  const mediumRisk = checks.filter(c => c.result === 'flag').length >= 2;

  if (highRisk) {
    await rejectOffer(offerId, 'fraud_detected');
    return { action: 'reject', reason: 'fraud' };
  }

  if (mediumRisk) {
    await escalate(offerId, 'fraud_flag');
    return { action: 'escalate', reason: 'suspicious' };
  }

  return { action: 'none' };
}
```

### 5. Escalation System (`services/escalation.ts`)

Integration with Telegram for human reviewers:

```typescript
async escalate(offerId: string, reason: string) {
  const offer = await db.offers.findById(offerId);

  // Mark as escalated
  await db.offers.update(offerId, {
    escalated: true,
    escalation_reason: reason,
    status: 'escalated'
  });

  // Send to Telegram
  await telegram.sendToReviewers({
    offerId: offer.id,
    reason,
    photos: offer.photos,
    aiIdentification: offer.ai_identification,
    confidence: offer.ai_confidence,
    marketData: offer.market_data,
    suggestedOffer: offer.offer_amount,
    buttons: [
      { text: 'Approve', callback: `approve:${offerId}` },
      { text: 'Custom Price', callback: `custom:${offerId}` },
      { text: 'Reject', callback: `reject:${offerId}` },
      { text: 'Flag Fraud', callback: `fraud:${offerId}` }
    ]
  });

  // Jake message to user
  await notifications.send(offer.user_id, 'escalation', {
    jake: {
      script: "Hold on a sec, partner. This one's a little special, and I wanna make sure I get you the right price.",
      voiceUrl: TIER1_VOICES.escalation
    }
  });
}

async handleReviewerAction(callbackData: string, reviewerId: string) {
  const [action, offerId] = callbackData.split(':');

  switch (action) {
    case 'approve':
      await db.offers.update(offerId, {
        status: 'ready',
        reviewer_id: reviewerId,
        reviewed_at: new Date()
      });
      // Continue normal flow
      break;

    case 'custom':
      // Prompt reviewer for custom price
      await telegram.requestCustomPrice(reviewerId, offerId);
      break;

    case 'reject':
      await rejectOffer(offerId, 'reviewer_decision');
      break;

    case 'fraud':
      await handleFraud(offerId);
      break;
  }
}
```

## INFRASTRUCTURE

### Queue System (BullMQ)

```typescript
// Queue definitions
const queues = {
  'vision-identify': { priority: 1, concurrency: 10 },
  'marketplace-research': { priority: 2, concurrency: 20 },
  'pricing-calculate': { priority: 1, concurrency: 50 },
  'jake-voice': { priority: 3, concurrency: 10 },
  'notifications': { priority: 4, concurrency: 100 }
};

// Workers
for (const [queueName, config] of Object.entries(queues)) {
  new Worker(queueName, async (job) => {
    return await processJob(queueName, job.data);
  }, {
    concurrency: config.concurrency,
    connection: redis
  });
}
```

### Caching Strategy

```typescript
// Redis cache patterns
CACHE_KEYS = {
  user: (id) => `user:${id}`,
  offer: (id) => `offer:${id}`,
  marketplace: (product) => `market:${hash(product)}`,
  config: 'config:all'
};

CACHE_TTL = {
  user: 60 * 5,        // 5 min
  offer: 60 * 2,       // 2 min (fast-changing)
  marketplace: 3600 * 6, // 6 hours
  config: 3600         // 1 hour
};
```

### Rate Limiting

```typescript
// Per-user rate limits
const rateLimits = {
  offers_per_day: 20,
  offers_per_hour: 5,
  api_calls_per_minute: 60
};

// Per-IP rate limits (anonymous)
const ipLimits = {
  offers_per_day: 3,
  api_calls_per_minute: 10
};
```

## INTEGRATION POINTS

**Consumes**:
- Frontend requests from Agent 1
- User photo uploads

**Calls**:
- Agent 2 (AI/Pricing) for vision, marketplace, pricing
- Agent 3 (Jake) for voice/script generation
- EasyPost/Shippo for shipping labels
- Stripe/PayPal for payouts
- S3 for storage
- Telegram for escalations

**Provides to**:
- Agent 1 (Frontend): All API responses, WebSocket updates
- Agent 5 (Admin): Dashboard data, analytics, config management

## FILE STRUCTURE

```
src/
├── api/
│   ├── routes/
│   │   ├── auth.ts
│   │   ├── offers.ts
│   │   ├── users.ts
│   │   ├── shipments.ts
│   │   └── webhooks.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   ├── rate-limit.ts
│   │   └── error-handler.ts
│   └── websocket.ts
├── services/
│   ├── orchestrator.ts
│   ├── shipping.ts
│   ├── payments.ts
│   ├── fraud.ts
│   ├── escalation.ts
│   ├── notifications.ts
│   └── storage.ts
├── db/
│   ├── schema.sql
│   ├── migrations/
│   └── client.ts
├── queue/
│   ├── workers.ts
│   └── jobs.ts
├── integrations/
│   ├── agent2.ts      # Calls to AI/Pricing agent
│   ├── agent3.ts      # Calls to Jake agent
│   ├── easypost.ts
│   ├── stripe.ts
│   ├── paypal.ts
│   ├── telegram.ts
│   └── s3.ts
└── index.ts
```

## QUALITY STANDARDS

1. **API Latency**: p95 <500ms for sync endpoints
2. **Queue Processing**: Jobs complete within SLA (vision <15s, total <30s)
3. **Uptime**: 99.9% availability
4. **Error Rate**: <0.1% 5xx errors
5. **Security**: All PII encrypted at rest, payouts tokenized

## TESTING

1. **Unit**: All services have >80% coverage
2. **Integration**: Full offer flow end-to-end
3. **Load**: 1000 concurrent offers without degradation
4. **Security**: Penetration testing, SQL injection, XSS
5. **Payments**: Test mode for all providers

## SUCCESS CRITERIA

- [ ] All API endpoints functional and documented
- [ ] Offer orchestration completes in <30s end-to-end
- [ ] WebSocket provides real-time updates to frontend
- [ ] Shipping labels generate successfully
- [ ] Payouts process to all methods
- [ ] Fraud detection flags suspicious offers
- [ ] Escalation system routes to Telegram
- [ ] Database schema supports all features
- [ ] Queue system processes jobs reliably
- [ ] Monitoring and error tracking active

---

**PROCEED AUTONOMOUSLY. BUILD THE FOUNDATION.**
