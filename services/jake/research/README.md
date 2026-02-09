# Jake Research Animation Choreography

**Agent 3 Deliverable**: Voice + Animation coordination for the 3-stage research flow

---

## Overview

The research animation is the **signature moment** of JakeBuysIt - where Jake examines the item, researches the market, and presents his offer with personality.

**Agent 3 Responsibility:**
- Define Jake's voice scripts for each stage
- Specify animation states and timing
- Coordinate tone shifts based on offer quality
- Provide pre-recorded audio URLs (Tier 1)

**NOT Agent 3 Responsibility:**
- Frontend UI rendering (Agent 1)
- Actual market data fetching (Agent 2)
- WebSocket infrastructure (Agent 4)

---

## Integration API

### For Agent 1 (Frontend)

```typescript
import { getResearchChoreography } from './services/jake/research';

const offerData = {
  offerId: 'uuid',
  item: 'AirPods Pro',
  brand: 'Apple',
  category: 'Consumer Electronics',
  fmv: 118,
  offer: 72,
  confidence: 87,
  comparables: 312,
  condition: 'Good',
};

// Get 3-stage choreography
const stages = getResearchChoreography(offerData);

// stages[0] = Stage A: Examining
// stages[1] = Stage B: Researching  
// stages[2] = Stage C: Deciding

stages.forEach((stage, index) => {
  console.log(`Stage ${index + 1}:`, stage.stage);
  console.log('Script:', stage.script);
  console.log('Animation:', stage.animation_state);
  console.log('Duration:', stage.duration_ms, 'ms');
  console.log('Substeps:', stage.substeps);
});
```

---

## Stage Breakdown

### Stage A: Examining (2-3s)
**Jake's Behavior:** Leans forward, squints at photo, expression shifts

**Voice Scripts:**
- "Alright, let's see what we got here..."
- "Lemme get a good look at this..."
- "Ohhh, interesting..."

**Animation State:** `examining`
**Tone:** `neutral`
**Duration:** 2500ms

**Substeps:**
1. 0ms: "Looking at the item..." (lean forward)
2. 800ms: "Checking condition..." (eyes scan)
3. 1800ms: "Got it..." (nod)

---

### Stage B: Researching (4-6s)
**Jake's Behavior:** Hand on chin, eyes scanning, thoughtful

**Voice Scripts:**
- "Checkin' eBay... Amazon... seein' what these are sellin' for..."
- "Hang tight, partner. Lookin' up recent sales on this one..."
- "Let me check what the market's sayin'..."

**Animation State:** `researching`
**Tone:** `confident`
**Duration:** 4000ms

**Substeps:**
1. 0ms: "Checking eBay..."
2. 1000ms: "Amazon data coming in..."
3. 2000ms: "Scanning Mercari..."
4. 3000ms: "Google Shopping..."
5. 3500ms: "Found 312 sales..."

---

### Stage C: Deciding (2-3s)
**Jake's Behavior:** Reaction based on offer quality

#### High Offer (ratio ≥ 0.7)
- **Script:** "NOW we're talkin'..."
- **Animation:** `excited`
- **Tone:** `excited`
- **Hint:** smile

#### Standard Offer (0.5 ≤ ratio < 0.7)
- **Script:** "Alright, got your number..."
- **Animation:** `offering`
- **Tone:** `confident`
- **Hint:** nod

#### Low Offer (0.3 ≤ ratio < 0.5)
- **Script:** "Here's what I can do..."
- **Animation:** `sympathetic`
- **Tone:** `sympathetic`
- **Hint:** subtle frown

#### Very Low (ratio < 0.3)
- **Script:** "Market's rough on these..."
- **Animation:** `disappointed`
- **Tone:** `disappointed`
- **Hint:** frown

**Duration:** 2500ms

**Substeps:**
1. 0ms: "Crunching numbers..."
2. 1000ms: "Calculating offer..."
3. 2000ms: "Got your price!" (animation hint)

---

## Response Format

```typescript
interface ResearchStage {
  stage: 'examining' | 'researching' | 'deciding';
  script: string;                    // Jake's voice line
  audio_url?: string;                // Pre-recorded clip (Tier 1)
  animation_state: JakeAnimationState; // Rive trigger
  tone: JakeTone;                    // Voice emotion
  duration_ms: number;               // Stage duration
  substeps?: ResearchSubstep[];      // Timing hints
}

interface ResearchSubstep {
  timestamp_ms: number;              // When to show message
  message: string;                   // Progress text
  animation_hint?: string;           // Optional animation cue
}
```

---

## Total Duration

```typescript
import { getTotalResearchDuration } from './services/jake/research';

const totalMs = getTotalResearchDuration(offerData);
// Returns: ~9000ms (9 seconds total)
```

**Breakdown:**
- Stage A: 2500ms
- Stage B: 4000ms
- Stage C: 2500ms
- **Total:** ~9 seconds

---

## Voice Assets (Tier 1)

Pre-recorded audio clips for instant playback:

```
jake-voices/tier1/
├── examining/
│   ├── exam_001.mp3  "Alright, let's see what we got here..."
│   ├── exam_002.mp3  "Lemme get a good look at this..."
│   ├── exam_003.mp3  "Ohhh, interesting..."
│   └── exam_004.mp3  "Nice... real nice..."
├── researching/
│   ├── research_001.mp3  "Checkin' eBay... Amazon..."
│   ├── research_002.mp3  "Hang tight, partner..."
│   ├── research_003.mp3  "Let me check what the market's sayin'..."
│   └── research_004.mp3  "Pullin' up sold listings..."
└── deciding/
    ├── excited_001.mp3       "NOW we're talkin'..."
    ├── confident_001.mp3     "Alright, got your number..."
    ├── sympathetic_001.mp3   "Here's what I can do..."
    └── disappointed_001.mp3  "Market's rough on these..."
```

---

## Animation State Mapping

| Stage | Animation State | Rive Trigger | Description |
|-------|----------------|--------------|-------------|
| Examining | `examining` | `state:examining` | Leans forward, squints |
| Researching | `researching` | `state:researching` | Hand on chin, eyes scan |
| Deciding (high) | `excited` | `state:excited` | Big eyes, smile |
| Deciding (standard) | `offering` | `state:offering` | Confident, slight nod |
| Deciding (low) | `sympathetic` | `state:sympathetic` | Head tilt, softer |
| Deciding (very low) | `disappointed` | `state:disappointed` | Shrug, frown |

---

## Example: Agent 1 Integration

```typescript
// 1. Get choreography from Agent 3
const stages = getResearchChoreography(offerData);

// 2. Iterate through stages
for (const stage of stages) {
  // Play Jake's voice
  const audio = new Howl({ src: [stage.audio_url] });
  audio.play();

  // Trigger Rive animation
  riveInstance.setInput('state', stage.animation_state);

  // Show substeps with timing
  stage.substeps?.forEach((substep) => {
    setTimeout(() => {
      console.log(substep.message);
      // Update progress UI
    }, substep.timestamp_ms);
  });

  // Wait for stage to complete
  await sleep(stage.duration_ms);
}

// 3. Transition to offer reveal
```

---

## Quality Criteria

✅ **Character Consistency**: All scripts match Jake's voice (contractions, address terms)  
✅ **Timing Accuracy**: Stages complete within specified durations  
✅ **Tone Matching**: Animation state matches offer quality  
✅ **Audio Availability**: All Tier 1 clips pre-recorded and cached  
✅ **Integration Clarity**: Agent 1 can consume API without ambiguity  

---

**Built by Agent 3: Jake Voice & Character System**
