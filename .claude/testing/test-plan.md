# Test Plan — JakeBuysIt E2E Testing

**Generated:** 2026-02-10 12:10 UTC
**Environment:** VPS Production (Hetzner Cloud via Coolify)
**VPS IP:** 89.167.42.128
**Coolify Panel:** http://89.167.42.128:8000
**Status:** ⚠️ App NOT YET DEPLOYED to VPS - needs first-time setup in Coolify
**App URL:** TBD (will be assigned by Coolify after deployment)
**Framework:** Next.js 16 (App Router)
**Auth System:** Custom JWT (Fastify backend /api/v1/auth)
**Backend API:** Fastify (port TBD by Coolify)
**Python AI:** FastAPI (port TBD by Coolify)

---

## Services Architecture

| Service | Port | Technology | Health Endpoint |
|---------|------|------------|-----------------|
| Frontend | 3000 | Next.js 16 | / |
| Backend API | 8080 | Fastify | /health |
| Python AI | 8000 | FastAPI | /health |
| Jake Service | 3002 | Node.js | /api/v1/health |
| Admin | 3001 | Next.js 16 | / |
| PostgreSQL | 5432 | Postgres 16 | pg_isready |
| Redis | 6379 | Redis 7 | PING |

---

## Routes Discovered

| Route | Type | Auth Required | Forms | CRUD | Priority |
|-------|------|---------------|-------|------|----------|
| / | Page | No | - | - | P0 |
| /submit | Page | No | Upload form, multi-photo, description | CREATE offer | P0 |
| /dashboard | Page | Yes | - | READ offers | P1 |
| /offers/[id] | Page | No (public view) | - | READ offer | P1 |
| /login | Page | No | Login form | AUTH | P0 |
| /register | Page | No | Registration form | CREATE user | P0 |
| /admin | Page | Yes (admin) | Various | CRUD | P2 |
| /admin/dashboard | Page | Yes (admin) | - | READ metrics | P2 |
| /admin/offers | Page | Yes (admin) | - | READ/UPDATE offers | P2 |

---

## API Endpoints Discovered

### Authentication (Priority P0)

| Endpoint | Method | Auth | Request Body | Expected Response |
|----------|--------|------|-------------|-------------------|
| /api/v1/auth/register | POST | No | {email, password, name} | 201 + {user, token} |
| /api/v1/auth/login | POST | No | {email, password} | 200 + {user, token} |
| /api/v1/auth/logout | POST | Yes | - | 200 |
| /api/v1/auth/refresh | POST | Yes | {refreshToken} | 200 + {token} |
| /api/v1/auth/me | GET | Yes | - | 200 + {user} |

### Offers (Priority P0)

| Endpoint | Method | Auth | Request Body | Expected Response |
|----------|--------|------|-------------|-------------------|
| /api/v1/offers | POST | Yes | {photos, description} | 201 + {offer} |
| /api/v1/offers | GET | Yes | ?status=ready | 200 + [offers] |
| /api/v1/offers/:id | GET | No | - | 200 + {offer} |
| /api/v1/offers/:id/accept | POST | Yes | - | 200 |
| /api/v1/offers/:id/decline | POST | Yes | - | 200 |

### Phase 4 Features (Priority P1)

| Endpoint | Method | Auth | Request Body | Expected Response |
|----------|--------|------|-------------|-------------------|
| /api/v1/offers/search | GET | No | ?q=query | 200 + [offers] (SEO) |
| /api/v1/profits/summary | GET | Yes | - | 200 + {profit stats} |
| /api/v1/profits/trends | GET | Yes | ?interval=week | 200 + [trends] |

### Python AI (Priority P1)

| Endpoint | Method | Auth | Request Body | Expected Response |
|----------|--------|------|-------------|-------------------|
| /api/v1/identify | POST | Internal | {photos, metadata} | 200 + {category, brand, model} |
| /api/v1/research | POST | Internal | {item_data} | 200 + {market_data} |
| /api/v1/price | POST | Internal | {item, market_data} | 200 + {fmv, offer_amount} |
| /health | GET | No | - | 200 |

---

## Forms Discovered

| Page | Form | Fields | Submits To | Validation | Priority |
|------|------|--------|-----------|-----------|----------|
| /submit | Photo Upload | photos (multi), description | /api/v1/offers | Required photos (1-10), optional description | P0 |
| /login | Login | email, password | /api/v1/auth/login | Required, email format | P0 |
| /register | Registration | email, password, name | /api/v1/auth/register | Required, email format, password min 8 chars | P0 |

---

## Data Flows (Offer Pipeline)

| Flow Name | Steps | Tables Affected | Priority |
|-----------|-------|-----------------|----------|
| User Registration | Fill form → Submit → Create user → Auto-login | users | P0 |
| Offer Submission | Upload photos → Submit → Create offer → Vision AI → Marketplace research → Pricing → Jake voice → READY | offers, audit_log | P0 |
| Offer Acceptance | View offer → Accept → Update status → Create shipment | offers, shipments | P1 |
| Offer Decline | View offer → Decline → Update status | offers | P1 |

### Offer Pipeline Stages (BullMQ Jobs)

1. **UPLOADED** → Backend creates offer record
2. **VISION** → Python AI identifies item (POST /api/v1/identify)
3. **MARKETPLACE** → Python AI researches market (POST /api/v1/research)
4. **PRICING** → Python AI calculates price (POST /api/v1/price)
5. **JAKE-VOICE** → Jake Service generates script + voice (POST /api/v1/generate-script)
6. **READY** → Offer presented to user

---

## Database Schema (11 Tables)

1. **users** — user accounts, auth, trust scores
2. **offers** — complete offer lifecycle tracking
3. **shipments** — USPS shipping labels
4. **verifications** — warehouse verification workflow
5. **payouts** — payment processing
6. **jake_bucks_transactions** — store credit ledger
7. **fraud_checks** — fraud detection results
8. **audit_log** — complete audit trail
9. **config** — business rules (JSON storage)
10. **price_history** — Phase 4: price changes audit trail
11. **sales** — Phase 4: profit tracking

---

## Test Users Required

| Email | Role | Password | Purpose |
|-------|------|----------|---------|
| testuser_e2e_2026021012@test.com | user | TestPass123! | Standard user flow testing |
| testadmin_e2e_2026021012@test.com | admin | AdminPass123! | Admin panel testing |

---

## Test Execution Order

### Phase 2a: Authentication (P0)
1. Register testuser
2. Login testuser
3. Session persistence (reload page, still logged in)
4. Logout
5. Register testadmin (with admin role if manual DB update needed)

### Phase 2b: Core CRUD - Offers (P0)
1. Login as testuser
2. Submit offer (upload photos + description)
3. Read offers list (verify test offer appears)
4. Read offer detail (view full offer)
5. Accept offer (update status)
6. Decline offer (create another, then decline)

### Phase 2c: Forms & Validation (P1)
1. Submit offer with missing photos → expect error
2. Submit offer with 11 photos → expect error (max 10)
3. Register with invalid email → expect error
4. Register with short password → expect error
5. Login with wrong password → expect error

### Phase 2d: Dashboard (P1)
1. Login and navigate to /dashboard
2. Verify offers display
3. Test filters (if implemented)
4. Test empty state (new user with no offers)

### Phase 2e: Admin Panel (P2)
1. Login as admin
2. Navigate to /admin
3. Verify admin routes load
4. Test that non-admin cannot access admin routes

### Phase 2f: Error Handling (P1)
1. Navigate to /nonexistent-route → expect 404
2. Access protected route without auth → expect redirect to login
3. Verify error pages display properly (not raw stack traces)

### Phase 2g: API Endpoints (P1)
1. Test backend health endpoint
2. Test Python AI health endpoint
3. Test auth endpoints (register, login, me)
4. Test offers endpoints
5. Test Phase 4 endpoints (search, profits)

### Phase 2h: Phase 4 Features (P1)
1. **OCR**: Upload photo with visible serial number → verify serial_number extracted
2. **Dynamic Pricing**: Check price_history table for any entries
3. **Profit Tracking**: Test /api/v1/profits/summary endpoint
4. **SEO**: Test /sitemap.xml, test search endpoint

---

## Expected Results

### Success Criteria
- ✅ All 7 containers running
- ✅ All health endpoints return 200 OK
- ✅ User registration works
- ✅ User login works
- ✅ Offer submission creates offer record
- ✅ Offer appears in dashboard
- ✅ Protected routes require authentication
- ✅ Admin routes require admin role
- ✅ Phase 4 migrations applied (seo_title, serial_number, price_history, sales tables exist)
- ✅ No critical JavaScript errors in console
- ✅ No failed network requests (except expected 401/403)

### Known Limitations
- Jake Voice may not generate actual audio (requires ELEVENLABS_API_KEY)
- eBay marketplace research requires EBAY_APP_ID
- Offer pipeline may stop at early stages if API keys missing
- Admin features are mostly stubs

---

## Bug Tracking

Bugs found during testing will be logged in test-log.md with:
- Severity (Critical, High, Medium, Low)
- Reproduction steps
- Expected vs actual behavior
- Root cause (after investigation)
- Fix applied (if --fix mode)
- Commit hash (if fixed)

---
