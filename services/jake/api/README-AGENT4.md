# Agent 3 ↔ Agent 4 Integration

**Contract Implementation for Backend Orchestrator**

---

## Overview

Agent 3 (Jake Voice & Character) provides HTTP endpoints that Agent 4 (Backend) calls during the offer pipeline.

**Agent 3 Server:** `http://localhost:3002`  
**Agent 4 Client:** `backend/src/integrations/agent3-client.ts`

---

## API Endpoints

### 1. POST /api/v1/generate-script

Generate Jake's script for a given scenario.

**Request:**
```typescript
{
  scenario: 'offer_high' | 'offer_standard' | 'offer_low' | 'offer_very_low' | 'greeting' | 'research',
  item_name: string,
  offer_amount?: number,
  fmv?: number,
  brand?: string,
  category?: string,
  condition?: string,
  user_familiarity?: 'new' | 'returning' | 'regular' | 'vip'
}
```

**Response:**
```typescript
{
  script: string,           // "Alright partner, here's what I can do..."
  tone: string,             // 'excited' | 'confident' | 'sympathetic' | etc.
  animation_state: string,  // 'excited' | 'offering' | 'sympathetic' | etc.
  tier: 1 | 2 | 3          // Voice tier used
}
```

**Example:**
```bash
curl -X POST http://localhost:3002/api/v1/generate-script \
  -H "Content-Type: application/json" \
  -d '{
    "scenario": "offer_standard",
    "item_name": "AirPods Pro",
    "offer_amount": 72,
    "fmv": 118,
    "brand": "Apple",
    "category": "Consumer Electronics"
  }'
```

---

### 2. POST /api/v1/generate-voice

Synthesize voice audio from script using ElevenLabs TTS.

**Request:**
```typescript
{
  script: string,  // Jake's script text
  tone: string     // Tone for voice settings
}
```

**Response:**
```typescript
{
  audio_url: string,    // CDN URL to MP3 file
  duration_ms: number,  // Audio duration in milliseconds
  tier: 1 | 2 | 3      // Always 2 for TTS
}
```

**Example:**
```bash
curl -X POST http://localhost:3002/api/v1/generate-voice \
  -H "Content-Type: application/json" \
  -d '{
    "script": "Alright partner, here is what I can do for ya...",
    "tone": "confident"
  }'
```

---

### 3. GET /api/v1/health

Health check endpoint for monitoring.

**Response:**
```typescript
{
  status: 'ok',
  agent: 'Agent 3 - Jake Voice & Character',
  version: '1.0.0',
  timestamp: '2026-02-09T...'
}
```

---

## Tier System

Agent 3 uses a 3-tier voice system:

| Tier | Method | Speed | Use Case |
|------|--------|-------|----------|
| 1 | Pre-recorded clips | <100ms | Common scenarios (greetings) |
| 2 | Template + TTS | 1-3s | Offers with variables |
| 3 | Dynamic LLM + TTS | 3-5s | Unusual items |

The `/generate-script` endpoint automatically selects the best tier.

---

## Scenario Mapping

Agent 4 scenarios → Jake scenarios:

| Agent 4 Scenario | Jake Scenario | Use Case |
|-----------------|---------------|----------|
| `offer_high` | `offer_high_value` | Ratio ≥ 70% |
| `offer_standard` | `offer_standard` | Ratio 50-70% |
| `offer_low` | `offer_low_value` | Ratio 30-50% |
| `offer_very_low` | `offer_low_value` | Ratio < 30% |
| `greeting` | `greeting_first` | User onboarding |
| `research` | `researching` | Market scan |

---

## Integration Flow

```
Agent 4 Orchestrator
  ↓
POST /api/v1/generate-script
  ← { script, tone, animation_state, tier }
  ↓
POST /api/v1/generate-voice
  ← { audio_url, duration_ms, tier }
  ↓
Store in offers table
  ↓
Frontend fetches offer with Jake voice
```

---

## Error Handling

**Timeout:** 15 seconds  
**Fallback:** Agent 4 has Tier 1 static scripts as fallback  

**If Agent 3 is down:**
- Agent 4 uses static Tier 1 scripts
- Pipeline continues without voice generation
- User still gets offer, just without audio

---

## Running Agent 3

```bash
# Development
npm run dev

# Production
npm run build
npm start

# Or direct
npm run server
```

**Environment Variables:**
```env
JAKE_PORT=3002
JAKE_HOST=localhost
ANTHROPIC_API_KEY=sk-ant-...
ELEVENLABS_API_KEY=...
JAKE_VOICE_ID=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_VOICE_BUCKET=jake-voices
CDN_BASE_URL=https://cdn.jakebuysit.com
```

---

## Testing Integration

```bash
# Start Agent 3
cd /path/to/agent3
npm run server

# Start Agent 4
cd /path/to/backend
npm run dev

# Test offer creation
curl -X POST http://localhost:3001/api/v1/offers \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "photoUrls": ["https://example.com/photo.jpg"],
    "userDescription": "AirPods Pro, good condition"
  }'

# Watch logs - Agent 4 should call Agent 3 endpoints
```

---

## Contract Changes

If you need to change the contract:

1. **Update Agent 3:** `services/jake/api/agent4-integration.ts`
2. **Update Agent 4:** `backend/src/integrations/agent3-client.ts`
3. **Update Types:** Ensure request/response types match
4. **Test:** Verify integration still works

---

**Agent 3 is ready for Agent 4 integration!** 🎤🎩
