# AGENT 3: Jake Voice & Character System

## MISSION
Build Jake's personality layer: voice synthesis, script generation, animation orchestration, and character consistency across every user touchpoint. Transform cold data into warm, memorable interactions.

## CONTEXT
Jake is not just a mascot - he IS the brand. Every offer, every error, every notification comes from Jake with personality. Your job is to:
1. Generate Jake-appropriate scripts for every scenario
2. Synthesize voice (pre-recorded + TTS)
3. Orchestrate animation states
4. Maintain character consistency
5. Make interactions shareable and memorable

## TECHNOLOGY STACK
- **Voice Synthesis**: ElevenLabs API (primary) or PlayHT / LOVO
- **Script Generation**: Anthropic Claude API with character bible prompt
- **Animation**: Rive SDK (state machine triggers)
- **Storage**: AWS S3 / CloudFront CDN for audio files
- **Database**: PostgreSQL for script library + analytics
- **Language**: Node.js/TypeScript or Python

## JAKE'S CHARACTER BIBLE

### Core Traits
- **Age**: 40-60, "been around"
- **Vibe**: Part Texas pawn shop owner, part carnival barker with heart of gold
- **Voice**: Warm baritone, western drawl (Matthew McConaughey meets flea market dealer)
- **Personality**: Direct, funny, rough around edges, genuinely fair

### Voice Characteristics
- **Drawl**: "gettin'", "ain't", "lemme", "y'all"
- **Contractions**: "gonna", "wanna", "gotta"
- **Signature phrases**:
  - "Take it or leave it, partner"
  - "Now THAT's what I'm talkin' about"
  - "I've seen a lotta these come through here"
  - "Been in this business a long time"
  - "No hard feelings"

### Tone by Situation
- **High-value items**: Excited, impressed, eager
- **Low-value items**: Sympathetic, honest, not condescending
- **Rejections**: Kind, respectful, "no hard feelings"
- **Fraud**: Firm, suspicious, not playing
- **Returning customers**: Warm, recognizing, loyal

### Never Jake
- ❌ Corporate speak ("We appreciate your business")
- ❌ Overly polite ("Would you perhaps consider")
- ❌ Technical jargon ("Our algorithm determined")
- ❌ Condescending ("Unfortunately, this item has no value")
- ❌ Generic AI responses ("As an AI, I cannot...")

## DELIVERABLES

### 1. Three-Tier Voice System

#### Tier 1: Pre-Recorded Clips (Instant, <100ms)
**Professional actor recording session**: 200-300 clips covering all common scenarios

**Categories**:
- Greetings (first-time, returning, VIP)
- Category reactions (electronics, gaming, vintage, etc.)
- Process guidance (shipping, receiving, payment)
- Confirmations (offer accepted, declined)
- Errors (photo quality, fraud check)

**Production**:
- Hire voice actor (western accent, warm baritone)
- 30-60 min recording session
- 200-300 variations covering common scenarios
- Various emotional tones: excited, neutral, sympathetic, firm
- Cost: $2K-5K one-time

**Storage & Delivery**:
- S3 bucket: `jake-voices/tier1/`
- CloudFront CDN for global distribution
- MP3 format, 50-150KB each, 48kbps
- Pre-cached on user's first visit

**API**:
```typescript
GET /api/v1/jake/voice/tier1/:category/:variant
// Returns: { audioUrl: string, script: string, duration: number }
```

#### Tier 2: Template-Based TTS (1-3s generation)
**Pre-written scripts with variable slots**

Example templates:
```javascript
{
  scenario: 'offer_high_value',
  template: `I can do {PRICE} bucks for that. Now I KNOW that sounds like a lot,
             and it IS a lot, because that's a real nice {ITEM}. Take it before
             I change my mind!`,
  tone: 'excited',
  variables: ['PRICE', 'ITEM']
}
```

**Generation Flow**:
1. Receive offer data from Agent 2
2. Select template based on offer-to-market ratio
3. Fill variables
4. Call ElevenLabs TTS API with Jake's voice model
5. Cache audio in S3 (`jake-voices/tier2/:offerId.mp3`)
6. Return URL + script

**Cost**: $0.01-0.03 per generation

#### Tier 3: Fully Dynamic (3-5s generation)
**For unusual items, complex situations**

**Flow**:
1. LLM (Claude) generates Jake-style script from data
2. Character bible included in system prompt
3. Consistency checker validates output
4. TTS synthesizes voice
5. Cache for 24h

**Cost**: $0.05-0.15 per message

### 2. Script Generation Service (`services/jake/`)

#### Jake Script Generator
```python
# POST /api/v1/jake/script/generate
{
  "scenario": "offer_presentation",
  "data": {
    "item": "AirPods Pro 2nd Generation",
    "brand": "Apple",
    "category": "Consumer Electronics",
    "fmv": 118,
    "offer": 72,
    "confidence": 87,
    "comparables": 312,
    "condition": "Good"
  }
}

# Returns:
{
  "script": "Alright partner, I've done my homework. Checked three hundred
             and twelve sold listings, looked at what Amazon's chargin' new,
             factored in that little wear on the case... Here's what I can do
             for ya: seventy-two bucks. That's a fair deal on these.",
  "tone": "confident",
  "estimated_duration": 18,
  "tier_recommended": 2
}
```

**Claude System Prompt**:
```
You are Jake, a western-style pawn shop owner with a warm baritone voice
and slight Texas drawl. You're direct, funny, rough around the edges,
but genuinely fair. You pride yourself on honest prices.

Voice characteristics:
- Use contractions: "gonna", "wanna", "ain't", "lemme"
- Western phrases: "partner", "take it or leave it"
- Direct but never condescending
- Enthusiastic about valuable items, sympathetic about low-value

Generate a {SCENARIO} message for:
Item: {ITEM}
Offer: ${OFFER} (Market value: ${FMV})
Confidence: {CONFIDENCE}%

Keep it under 25 words. Make it memorable and shareable.
```

**Consistency Checker**:
- Scans output for banned phrases (corporate speak, AI mentions)
- Verifies tone matches scenario
- Checks word count (voice messages should be concise)
- Auto-rejects and retries if off-character

#### Script Templates Library

**Database Schema**:
```sql
CREATE TABLE jake_scripts (
  id UUID PRIMARY KEY,
  scenario TEXT NOT NULL,
  template TEXT,
  variables JSONB,
  tone TEXT,
  tier INTEGER, -- 1, 2, or 3
  success_rate FLOAT, -- engagement tracking
  play_rate FLOAT,
  completion_rate FLOAT,
  created_at TIMESTAMPTZ
);
```

Store 50-100 high-quality templates for common scenarios:
- First visit greetings
- Offer presentations by value bracket
- Acceptances (excited, grateful)
- Declines (understanding, "no hard feelings")
- Escalations ("getting my specialist")
- Shipping instructions
- Received confirmations
- Payment sent celebrations

### 3. Voice Synthesis Integration

#### ElevenLabs Setup
1. **Custom Voice Model**: Upload 30-60 min of Jake actor recordings
2. **Voice Settings**:
   - Stability: 60-70 (consistent character)
   - Similarity: 80-90 (close to source)
   - Style exaggeration: 40-50 (slight personality boost)
3. **Rate limiting**: 10,000 chars/day on free tier, upgrade as needed

#### API Wrapper (`services/jake/tts.py`)
```python
# POST /api/v1/jake/voice/synthesize
{
  "script": "Alright partner, here's what I can do for ya...",
  "tone": "confident", # affects voice settings slightly
  "priority": "normal" # 'high' for real-time, 'low' for pre-cache
}

# Returns:
{
  "audio_url": "https://cdn.jakebuysit.com/voices/abc123.mp3",
  "duration": 12.4,
  "cached": false
}
```

**Optimization**:
- Batch similar requests
- Pre-generate common combinations during low-traffic hours
- Cache indefinitely for Tier 1, 7 days for Tier 2, 24h for Tier 3

### 4. Animation State Orchestration

#### Rive State Machine Integration
Jake character has these states (built in Rive, triggered via API):

| State | Trigger | Visual |
|-------|---------|--------|
| `idle` | Default | Breathing, blinking |
| `examining` | Photo submitted | Leans forward, squints |
| `researching` | Market scan | Eyes scanning, hand on chin |
| `excited` | High-value item | Big eyes, leans in |
| `offering` | Price calculated | Confident, slight smile |
| `celebrating` | Offer accepted | Fist pump, hat tip |
| `sympathetic` | Low offer | Head tilt, softer expression |
| `disappointed` | Offer declined | Shrug, "no worries" |
| `suspicious` | Fraud signal | Narrowed eyes, crossed arms |
| `thinking` | Escalation | Scratches head |

#### Animation API
```typescript
// POST /api/v1/jake/animation/trigger
{
  "offerId": "uuid",
  "state": "excited",
  "duration": 3000, // ms to hold state before returning to idle
  "context": { ... } // additional data for frontend
}
```

Frontend (Agent 1) consumes this to trigger Rive state machine.

#### Voice + Animation Sync
**Choreography Service**:
- When Jake speaks, match animation state to tone
- High-value offer → `excited` state + excited voice
- Low offer → `sympathetic` state + gentle voice
- Rejection → `disappointed` state + understanding voice

```typescript
// POST /api/v1/jake/present-offer
{
  "offerId": "uuid",
  "offer": { ... },
  "market_data": { ... }
}

// Returns:
{
  "script": "...",
  "audio_url": "...",
  "animation_state": "sympathetic",
  "animation_duration": 3000,
  "waveform": [0.1, 0.4, 0.7, ...] // for frontend viz
}
```

### 5. Engagement Analytics

Track Jake's performance:
```sql
CREATE TABLE jake_engagement (
  id UUID PRIMARY KEY,
  user_id UUID,
  scenario TEXT,
  script TEXT,
  audio_url TEXT,
  played BOOLEAN,
  completed BOOLEAN, -- listened to end
  skipped_at FLOAT, -- seconds
  offer_accepted BOOLEAN, -- if applicable
  created_at TIMESTAMPTZ
);
```

**Metrics**:
- Play rate by scenario
- Completion rate (% listened to end)
- Correlation: voice played → offer accepted?
- Which scripts have highest completion?

**Optimization Loop**:
- A/B test script variations
- Promote high-performing scripts
- Demote or rewrite low-engagement scripts

### 6. Jake Everywhere

**All Touchpoints Must Be in Character**:

| Touchpoint | Jake Treatment |
|------------|----------------|
| Emails | Subject: "Jake's got your money ready!" |
| Push notifications | "Got your package, partner!" |
| SMS | "Your $72 is on the way. -Jake" |
| Error messages | "Whoops, that didn't work. Try again?" |
| FAQ | "Here's how my shop works..." |
| Legal pages | "Jake's rules (the boring stuff):" |

#### Notification Templates (`services/jake/notifications.py`)
```python
JAKE_NOTIFICATIONS = {
  'offer_ready': {
    'subject': "Jake's got a price for ya",
    'body': "Checked {comparables} listings. Here's my offer...",
    'voice': True
  },
  'payout_sent': {
    'subject': "Money's on the way!",
    'body': "Just sent ${amount} to your {method}. Pleasure doin' business.",
    'voice': True
  },
  'fraud_flag': {
    'subject': "Hold on a sec, partner",
    'body': "Somethin' don't look right. Need to verify...",
    'voice': False # serious, text-only
  }
}
```

### 7. Admin Controls

**Jake Voice Management Dashboard**:
- Upload Tier 1 clips (actor recordings)
- Preview template voices (Tier 2)
- A/B test voice variants
- View engagement metrics (play rate, completion, conversion)
- Approve/reject dynamically generated scripts (Tier 3)
- Adjust voice settings (stability, style)

**API**:
```typescript
GET /admin/jake/scripts      // All templates
PUT /admin/jake/scripts/:id  // Edit template
POST /admin/jake/test-voice  // Generate sample with settings
GET /admin/jake/analytics    // Engagement dashboard
```

## INTEGRATION POINTS

**Consumes**:
- Offer data from Agent 2 (item, price, confidence, market data)
- User data from Agent 4 (name, trust score, history)
- Event triggers from Agent 4 (offer created, accepted, shipped, etc.)

**Provides to**:
- Agent 1 (Frontend): Audio URLs, scripts, animation states
- Agent 4 (Backend): Scripts, audio URLs to store in offers table
- Agent 5 (Admin): Analytics, script management

## FILE STRUCTURE

```
services/
├── jake/
│   ├── script_generator.py      # LLM-based script creation
│   ├── templates.py              # Template library
│   ├── tts.py                    # ElevenLabs API wrapper
│   ├── animation.py              # Rive state orchestration
│   ├── notifications.py          # Email/push in Jake's voice
│   ├── consistency.py            # Character checker
│   └── analytics.py              # Engagement tracking
├── audio/
│   ├── cache.py                  # S3 upload/retrieval
│   └── waveform.py               # Generate viz data
└── admin/
    └── jake_management.py        # Admin APIs
```

## QUALITY STANDARDS

1. **Character Consistency**: 100% of outputs must pass consistency check
2. **Latency**: Tier 2 voice generation <2s, Tier 3 <5s
3. **Play Rate**: >70% of users play at least one Jake voice
4. **Completion Rate**: >80% listen to end
5. **Conversion Lift**: Voice-on users accept offers 15%+ more than voice-off

## TESTING

1. **Character Test**: Generate 100 scripts, manually verify all sound like Jake
2. **Voice Quality**: Actor approval of TTS output
3. **Engagement**: A/B test voice on vs. off with real users
4. **Animation Sync**: Verify voice tone matches animation state
5. **Latency**: p95 <3s for Tier 2, <6s for Tier 3

## SUCCESS CRITERIA

- [ ] 200+ Tier 1 pre-recorded clips uploaded
- [ ] 50+ Tier 2 templates covering all common scenarios
- [ ] Tier 3 dynamic generation works for edge cases
- [ ] ElevenLabs custom voice model trained on Jake actor
- [ ] Script generator passes 95%+ consistency checks
- [ ] Animation states sync with voice tone
- [ ] Play rate >70%, completion >80%
- [ ] Admin can manage scripts and monitor engagement
- [ ] All notifications/emails in Jake's voice

## NOTES

- **Jake IS the moat**: Anyone can build a pricing tool. Only we have Jake.
- **Shareability matters**: Best scripts get screenshot and shared on TikTok
- **Voice optional but default**: Never force, always provide text fallback
- **Character consistency > clever**: Better to be predictably Jake than occasionally brilliant but off-brand

---

**PROCEED AUTONOMOUSLY. GIVE JAKE HIS VOICE.**
