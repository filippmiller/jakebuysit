# JakeBuysIt Project Overview

Product and business context for agents working on the JakeBuysIt platform.

---

## What is JakeBuysIt

An AI-powered online pawn shop where users sell their stuff for instant cash. Instead of a sterile, transactional interface, every interaction is delivered through **Jake** — a western-style pawn dealer character with a real personality. Users snap a photo of an item, Jake identifies it with AI vision, checks live marketplace prices, and makes a fair cash offer in seconds.

The platform handles the entire lifecycle: photo submission, AI identification, market research, pricing, offer presentation, acceptance, shipping, warehouse verification, and payout.

---

## How It Works

### User Flow

```
1. SNAP      User takes or uploads photos (up to 6) of their item
                Optional: add a text description
                No registration required to get an offer
                       |
2. IDENTIFY  AI vision (Claude) identifies the item
                Category, brand, model, condition
                Confidence score determines if it proceeds or escalates
                       |
3. RESEARCH  Marketplace data pulled from eBay sold listings
                Median, mean, price range across recent sales
                Minimum 3 comparables needed or escalates to human
                       |
4. PRICE     Fair Market Value calculated
                Offer = FMV x condition_multiplier x category_margin
                High-value items (>$500) escalated for human review
                       |
5. PRESENT   Jake delivers the offer with personality
                Voice audio (3-tier system), animated character
                Script matches the offer level (excited, standard, sympathetic)
                Offer valid for 24 hours
                       |
6. DECIDE    User accepts or declines
                Accept: must register/login, triggers shipping flow
                Decline: no hard feelings, come back anytime
                       |
7. SHIP      Prepaid shipping label generated
                User ships item to warehouse (Austin, TX)
                Tracking updates via carrier webhooks
                       |
8. VERIFY    Warehouse staff inspect the item
                Condition match check, photos at receipt, serial number
                May revise offer if condition differs
                       |
9. PAY       Payout via user's preferred method
                PayPal, Venmo, Zelle, bank transfer, or Jake Bucks
                Jake Bucks = store credit with bonus incentive
```

### What Happens Behind the Scenes

Each step 2-5 is a **BullMQ job** processed asynchronously. The backend orchestrator chains them together — when one completes, it queues the next. The frontend polls `GET /offers/:id` to track the `processingStage` field in real time.

Total pipeline time: ~15-30 seconds from photo to offer.

---

## Jake the Character

Jake is not a mascot. He IS the product experience. Every message, every notification, every error comes from Jake.

### Identity

- **Age**: 40-60, "been around"
- **Occupation**: Pawn shop owner
- **Region**: Western (Texas-inspired)
- **Voice**: Warm baritone, western drawl — "Matthew McConaughey meets flea market dealer"
- **Archetype**: Fair dealer with personality

### Personality Traits

| Trait | Description |
|-------|-------------|
| Direct | Tells it like it is, no sugarcoating |
| Fair | Prides himself on honest prices |
| Enthusiastic | Genuinely excited about valuable items |
| Patient but urgent | Friendly, but offers expire |
| Nostalgic | Has stories about everything |
| Respectful | Never condescending, even on low offers |
| Humorous | Finds the funny side without being clownish |

### Tone by Situation

| Situation | Jake's Tone | Example |
|-----------|-------------|---------|
| High-value item | Excited, impressed | "NOW we're talkin'! That's a real nice piece right there." |
| Standard item | Confident, professional | "I can do that. Fair price, better than eBay after fees." |
| Low-value item | Sympathetic, honest | "Market's soft on these. But hey, six bucks is better than dust on your shelf." |
| Rejection | Kind, respectful | "Gotta pass on this one. No hard feelings though." |
| Fraud detected | Firm, suspicious | "Somethin' don't look right here. I need you to verify this." |
| Returning customer | Warm, recognizing | "Well look who's back! Good to see ya, partner." |

### Speech Patterns

- **Contractions**: gonna, wanna, gotta, ain't, lemme, gettin', talkin'
- **Terms of address**: partner, friend, boss, chief, pal
- **Signature phrases**: "Take it or leave it, partner", "No hard feelings", "Fair and square"
- **Word limit**: 30 words max per message

### Banned Patterns (Never Jake)

- Corporate speak: "We appreciate your business", "Thank you for choosing"
- Overly polite: "Would you perhaps consider", "I sincerely apologize"
- Technical jargon: "Our algorithm determined", "The system calculated"
- Condescending: "Unfortunately, this item has no value"
- AI references: "As an AI, I cannot", "I'm programmed to"

### Three-Tier Voice System

| Tier | Method | Latency | Use Case |
|------|--------|---------|----------|
| **Tier 1** | Pre-recorded clips | <100ms | Common scenarios (greetings, reactions) |
| **Tier 2** | Template + variables | ~500ms | Offer presentations with specific numbers |
| **Tier 3** | AI-generated (ElevenLabs) | 2-5s | Unique/complex scenarios |

---

## Business Rules

### Pricing Formula

```
offer_amount = FMV x condition_multiplier x category_margin
```

Where FMV is the median sold price from eBay comparable listings.

### Category Margins (% of FMV offered to seller)

| Category | Margin |
|----------|--------|
| Phones & Tablets | 65% |
| Consumer Electronics | 60% |
| Gaming | 60% |
| Tools & Equipment | 55% |
| Collectibles & Vintage | 50% |
| Small Appliances | 50% |
| Clothing & Fashion | 45% |
| Books & Media | 35% |

### Condition Multipliers

| Condition | Multiplier |
|-----------|-----------|
| New | 1.00 |
| Like New | 0.925 |
| Good | 0.80 |
| Fair | 0.625 |
| Poor | 0.40 |

### Limits and Thresholds

| Rule | Value |
|------|-------|
| Minimum offer | $5 |
| Maximum offer (auto-approved) | $500 |
| Maximum offer ceiling | $2,000 (category-dependent, Collectibles up to $5,000) |
| Daily platform spending limit | $10,000 |
| Offer expiry | 24 hours |
| Rate limit (offers/hour) | 5 per user or IP |
| Rate limit (offers/day) | 20 per user |
| New account max offer (first 30 days) | $100 |
| Max photos per submission | 6 |
| Max photo size | 10MB |
| Accepted file types | JPEG, PNG, WebP, HEIC |

### Payout Methods

PayPal, Venmo, Zelle, bank transfer, or **Jake Bucks** (store credit with bonus incentive).

### Jake Familiarity Tiers

Users progress through familiarity levels based on transaction history:

| Tier | Label | Effect |
|------|-------|--------|
| `new` | First-time user | Default greeting, lower trust |
| `returning` | Has completed 1+ transactions | Warmer greeting, recognized |
| `regular` | Frequent seller | Familiar tone, loyalty benefits |
| `vip` | High-volume seller | Special treatment, priority |

---

## Target Users

People who have stuff sitting around that they want to sell quickly for cash, without the hassle of listing on marketplaces. Primary categories:

- **Electronics**: phones, tablets, laptops, gaming consoles, headphones
- **Consumer goods**: small appliances, tools, cameras
- **Collectibles**: vintage items, rare finds
- **Fashion**: designer clothing, accessories
- **Media**: books, games, movies

The value proposition vs. alternatives:
- **vs. eBay/Facebook Marketplace**: No listing, no waiting for buyers, no shipping hassle, instant price
- **vs. local pawn shops**: No driving, no awkward haggling, transparent AI-backed pricing
- **vs. trade-in programs**: Higher prices (Jake aims for ~50-65% of FMV vs. trade-in ~30-40%)

---

## Current Status

### What's Built and Working

- Full offer pipeline (photo → vision → marketplace → pricing → jake voice → ready)
- Offer orchestrator with BullMQ job chaining and escalation logic
- Auth system (register, login, refresh token rotation)
- Offers API (create, get, accept, decline, list, recent ticker)
- Photo upload to S3
- Agent 2 HTTP integration client (vision, marketplace, pricing)
- Agent 3 HTTP integration client (script, voice)
- Redis caching layer with rate limiting
- Database schema (11 tables) with all indexes and triggers
- Jake character bible and consistency checking
- Docker Compose for all 7 services
- Frontend landing page and submit flow (dark glassmorphism theme)

### What's Stubbed (Not Yet Implemented)

- **Backend routes**: users, shipments, webhooks, admin (all return placeholder messages)
- **Agent 2 HTTP endpoints**: Python FastAPI router files exist but are stubs
- **Agent 3 HTTP API**: `services/jake/api/routes.ts` has partial implementation
- **Admin platform**: 36 out of 40+ components are stubs
- **Shipping integration**: EasyPost API not wired up
- **Payment processing**: Stripe/PayPal integration not connected
- **Fraud detection**: Schema exists, no runtime checks implemented
- **Warehouse verification flow**: Schema exists, no endpoints
- **WebSocket real-time updates**: Plugin registered but no handlers

### Known Issues

- `_apply_recency_weighting` in `services/marketplace/aggregator.py` is dead code (calculates weights but discards results)
- GitHub repo has 37 dependency vulnerabilities flagged
- Git history was force-pushed to orphan branch (original incremental commits are orphaned locally)

---

## Agent Responsibilities

| Agent | Name | Owns | Tech |
|-------|------|------|------|
| **Agent 1** | Frontend & UX | Customer web app, camera capture, Jake animations, offer flow UI | Next.js 16, React 19, Tailwind, Rive, Zustand |
| **Agent 2** | AI & Vision & Pricing | Item identification, marketplace research, FMV calculation | Python, FastAPI, Claude Vision, eBay API |
| **Agent 3** | Jake Voice & Character | Script generation, voice synthesis, animation states, character consistency | Node.js, Claude API, ElevenLabs, S3 |
| **Agent 4** | Backend & Infrastructure | API gateway, offer orchestrator, auth, queues, database, integrations | Node.js, Fastify, BullMQ, PostgreSQL, Redis |
| **Agent 5** | Admin & Operations | Operations dashboard, escalation queue, analytics, user management | Next.js 16, admin API routes |

Agent 4 (Backend) is the **orchestrator** — all other agents connect through it. Agent 2 and Agent 3 are downstream services called via HTTP during the offer pipeline.
