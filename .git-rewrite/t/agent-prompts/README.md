# JakeBuysIt - Parallel Agent Implementation Plan

## Overview

This directory contains prompts for 5 specialized agents that will implement the complete JakeBuysIt platform in parallel. Each agent has a distinct architectural domain with minimal dependencies, allowing for simultaneous development.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        JAKEBUYSIT                            │
└─────────────────────────────────────────────────────────────┘

        ┌──────────────┐
        │   AGENT 1    │  ← User-facing web app
        │  Frontend &  │     (Next.js, Rive, Howler.js)
        │  User UX     │
        └──────┬───────┘
               │
        ┌──────▼───────┐
        │   AGENT 4    │  ← Central orchestrator
        │   Backend &  │     (Fastify/FastAPI, PostgreSQL)
        │Infrastructure│
        └──┬────────┬──┘
           │        │
    ┌──────▼──┐  ┌─▼────────┐
    │ AGENT 2 │  │ AGENT 3  │
    │AI Vision│  │   Jake   │
    │& Pricing│  │  Voice   │
    └─────────┘  └──────────┘
                      │
               ┌──────▼───────┐
               │   AGENT 5    │  ← Internal operations
               │   Admin &    │     (Dashboard, Telegram)
               │  Operations  │
               └──────────────┘
```

## Agent Responsibilities

### Agent 1: Frontend & User Experience
**Domain**: User-facing web application
**Tech**: Next.js 14+, Rive, Framer Motion, Howler.js, Zustand
**Key Deliverables**:
- Landing page with animated Jake
- Multi-photo submission flow
- Real-time research animation (3-stage sequence)
- Offer presentation with voice playback
- Dashboard, batch mode, shipping screens

**Dependencies**: Consumes APIs from Agent 4

---

### Agent 2: AI Vision & Pricing Engine
**Domain**: Intelligence layer
**Tech**: Python/Node.js, Claude Vision, eBay API, Amazon API, Redis
**Key Deliverables**:
- Multi-stage vision pipeline (identification → enrichment → condition)
- Marketplace data integration (eBay, Amazon, Google Shopping)
- Fair market value calculation
- Dynamic pricing engine with configurable margins
- Confidence scoring and fallback models

**Dependencies**: Provides data to Agents 3, 4, 5

---

### Agent 3: Jake Voice & Character System
**Domain**: Brand personality layer
**Tech**: ElevenLabs API, Claude for script generation, Rive SDK
**Key Deliverables**:
- Three-tier voice system (pre-recorded, template, dynamic)
- Script generation with character consistency
- Animation state orchestration
- Voice + animation sync
- Engagement analytics

**Dependencies**: Consumes offer data from Agent 2, provides audio/scripts to Agents 1, 4

---

### Agent 4: Backend API & Infrastructure
**Domain**: Core platform services
**Tech**: Fastify/FastAPI, PostgreSQL, Redis, BullMQ, S3, Stripe, EasyPost
**Key Deliverables**:
- RESTful API + WebSocket
- Database schema and migrations
- Offer orchestration (coordinates Agents 2 & 3)
- Authentication, shipping, payments
- Fraud detection, escalation system
- Queue processing

**Dependencies**: Central hub - calls Agents 2 & 3, provides APIs to Agents 1 & 5

---

### Agent 5: Admin & Operations Platform
**Domain**: Internal operations
**Tech**: Next.js, Shadcn/ui, Recharts, Telegram Bot API
**Key Deliverables**:
- Real-time dashboard
- Escalation interface (web + Telegram)
- Configuration panel (margins, thresholds)
- Jake voice management
- Warehouse verification flow
- Fraud monitoring, analytics

**Dependencies**: Consumes all data from Agent 4, provides operational control

---

## Dependency Graph

```
Agent 1 ──API calls──> Agent 4 ──orchestrates──> Agent 2
                                               └─> Agent 3

Agent 5 ──admin APIs──> Agent 4 ──data from──> Agent 2, 3

Agent 2 ──pricing data──> Agent 3 (for script context)
```

**Minimal blocking dependencies**:
- Agent 4 must establish API contracts first
- Agents 2 & 3 can develop in parallel
- Agent 1 can use mock APIs during Agent 4 development
- Agent 5 can develop UI with mock data

---

## Implementation Strategy

### Phase 1: Foundation (Weeks 1-2)
**All agents work in parallel**:
- **Agent 1**: Build static UI components (no API integration)
- **Agent 2**: Develop vision pipeline with test images
- **Agent 3**: Record Jake voice clips, build script generator
- **Agent 4**: Set up database, implement core API structure
- **Agent 5**: Build dashboard UI with mock data

### Phase 2: Integration (Weeks 3-4)
**Connect the pieces**:
- **Agent 4**: Implement orchestration layer
- **Agent 1**: Integrate with Agent 4 APIs
- **Agent 2**: Connect marketplace APIs, optimize caching
- **Agent 3**: Integrate with Agent 4 for voice delivery
- **Agent 5**: Connect to live data from Agent 4

### Phase 3: Polish (Weeks 5-6)
**Refine the experience**:
- **Agent 1**: Animation polish, performance optimization
- **Agent 2**: Improve accuracy, add fallback models
- **Agent 3**: A/B test voice scripts, optimize engagement
- **Agent 4**: Load testing, error handling, monitoring
- **Agent 5**: Analytics, fraud detection tuning

---

## Running the Agents

### Option 1: Sequential Execution
```bash
# Run each agent prompt manually
cat agent-prompts/AGENT-1-FRONTEND-UX.md
# Copy prompt to Claude Code, wait for completion

cat agent-prompts/AGENT-2-AI-VISION-PRICING.md
# Copy prompt to Claude Code, wait for completion

# ... etc
```

### Option 2: Parallel Execution (Recommended)
**Use 5 separate Claude Code sessions**:

1. Open 5 terminal windows or tabs
2. In each, start Claude Code
3. Paste the appropriate agent prompt
4. Let all 5 agents work simultaneously

**Session 1**:
```bash
claude
# Paste AGENT-1-FRONTEND-UX.md
```

**Session 2**:
```bash
claude
# Paste AGENT-2-AI-VISION-PRICING.md
```

**Session 3**:
```bash
claude
# Paste AGENT-3-JAKE-VOICE-CHARACTER.md
```

**Session 4**:
```bash
claude
# Paste AGENT-4-BACKEND-INFRASTRUCTURE.md
```

**Session 5**:
```bash
claude
# Paste AGENT-5-ADMIN-OPERATIONS.md
```

### Option 3: Git Worktrees (Recommended for isolation)
**Each agent works in its own branch**:

```bash
# Create worktrees for parallel development
git worktree add ../pawn-agent1 -b agent1-frontend
git worktree add ../pawn-agent2 -b agent2-ai-vision
git worktree add ../pawn-agent3 -b agent3-jake-voice
git worktree add ../pawn-agent4 -b agent4-backend
git worktree add ../pawn-agent5 -b agent5-admin

# Run Claude Code in each directory
cd ../pawn-agent1 && claude
cd ../pawn-agent2 && claude
# ... etc
```

---

## Communication & Coordination

### Shared Contracts (Agent 4 defines these first)

**API Endpoints** (`contracts/api.ts`):
```typescript
// Agent 1 → Agent 4
POST /api/v1/offers/create
WS /api/v1/offers/:id/stream
GET /api/v1/offers/:id

// Agent 4 → Agent 2
POST /internal/v1/vision/identify
POST /internal/v1/pricing/calculate

// Agent 4 → Agent 3
POST /internal/v1/jake/generate-script
POST /internal/v1/jake/synthesize-voice
```

**Database Schema** (`contracts/schema.sql`):
Agent 4 creates, all agents reference

**Environment Variables** (`.env.example`):
```bash
# Agent 2
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
EBAY_API_KEY=
AMAZON_API_KEY=

# Agent 3
ELEVENLABS_API_KEY=

# Agent 4
DATABASE_URL=
REDIS_URL=
JWT_SECRET=
AWS_S3_BUCKET=
STRIPE_SECRET_KEY=
EASYPOST_API_KEY=

# Agent 5
TELEGRAM_BOT_TOKEN=
ADMIN_JWT_SECRET=
```

---

## Success Criteria

### Integration Milestones

**Milestone 1: Smoke Test**
- [ ] Agent 1 can submit photos to Agent 4
- [ ] Agent 4 receives photos, stores in DB
- [ ] Agent 2 identifies item from photo
- [ ] Agent 3 generates voice for offer
- [ ] Agent 1 displays offer with voice playback

**Milestone 2: End-to-End Flow**
- [ ] Full offer flow: submit → research → offer → accept → label
- [ ] Escalation triggers Admin dashboard (Agent 5)
- [ ] Payout processes successfully

**Milestone 3: Production Ready**
- [ ] All error handling in place
- [ ] Monitoring active (Datadog/Sentry)
- [ ] Load testing passed (1000 concurrent offers)
- [ ] Security audit passed
- [ ] Jake voice engagement >70%

---

## Risk Mitigation

### Potential Conflicts

1. **API Contract Changes**
   - **Solution**: Agent 4 publishes OpenAPI spec first
   - All agents validate against spec

2. **Database Schema Changes**
   - **Solution**: Agent 4 uses migrations
   - All agents pull latest schema before modifying

3. **Merge Conflicts**
   - **Solution**: Each agent works in separate directories
   - `frontend/`, `ai-engine/`, `jake-services/`, `backend/`, `admin/`

4. **Dependency Hell**
   - **Solution**: Monorepo with shared `package.json` for common deps
   - Agent-specific deps in subdirectories

---

## Project Structure

```
jakebuysit/
├── frontend/              # Agent 1
│   ├── app/
│   ├── components/
│   └── package.json
├── ai-engine/             # Agent 2
│   ├── services/
│   ├── vision/
│   ├── pricing/
│   └── requirements.txt
├── jake-services/         # Agent 3
│   ├── services/
│   ├── audio/
│   └── package.json
├── backend/               # Agent 4
│   ├── api/
│   ├── services/
│   ├── db/
│   └── package.json
├── admin/                 # Agent 5
│   ├── app/
│   ├── components/
│   └── package.json
├── contracts/             # Shared contracts
│   ├── api.ts
│   ├── schema.sql
│   └── types.ts
├── agent-prompts/         # This directory
└── docker-compose.yml     # Local dev environment
```

---

## Next Steps

1. **Prep Environment**:
   ```bash
   # Create directory structure
   mkdir -p frontend ai-engine jake-services backend admin contracts

   # Initialize git worktrees (optional)
   git worktree add ../pawn-agent1 -b agent1-frontend
   git worktree add ../pawn-agent2 -b agent2-ai-vision
   git worktree add ../pawn-agent3 -b agent3-jake-voice
   git worktree add ../pawn-agent4 -b agent4-backend
   git worktree add ../pawn-agent5 -b agent5-admin
   ```

2. **Start Agent 4 First** (30 min head start):
   - Define API contracts
   - Create database schema
   - Set up basic server
   - Publish OpenAPI spec

3. **Launch All Agents**:
   - Open 5 Claude Code sessions
   - Paste respective prompts
   - Monitor progress in each session

4. **Daily Standups** (Coordinate human review):
   - Review integration points
   - Resolve conflicts
   - Adjust priorities

5. **Integration Testing**:
   - After Day 3, start end-to-end tests
   - Smoke test critical paths
   - Iterate on issues

---

## Estimated Timeline

| Week | Agent 1 | Agent 2 | Agent 3 | Agent 4 | Agent 5 |
|------|---------|---------|---------|---------|---------|
| 1    | UI Components | Vision Pipeline | Voice Recording | API + DB | Dashboard UI |
| 2    | Integration | Marketplace APIs | Script Gen | Orchestration | Admin Features |
| 3    | Polish | Accuracy | Voice Tiers | Payments/Shipping | Telegram Bot |
| 4    | Testing | Caching | Engagement | Queue System | Analytics |
| 5    | PWA | Fallbacks | A/B Tests | Security | Warehouse |
| 6    | Launch Prep | Optimization | Launch Prep | Monitoring | Launch Prep |

**Total**: 6 weeks to MVP with 5 parallel agents

---

## Launch Checklist

Before going live:
- [ ] All agent success criteria met
- [ ] End-to-end smoke test passed
- [ ] Load testing passed (1000 offers/day)
- [ ] Security audit completed
- [ ] Legal review (ToS, Privacy)
- [ ] Jake voice actor contract signed
- [ ] Warehouse space secured
- [ ] Payment processor accounts live (Stripe, PayPal)
- [ ] Domain purchased, DNS configured
- [ ] Monitoring dashboards active
- [ ] On-call rotation scheduled

---

**Questions?** Review individual agent prompts for detailed technical specifications.

**Let's build Jake's shop.**
