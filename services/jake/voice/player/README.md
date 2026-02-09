# Jake Voice Player

**Agent 3 Deliverable**: Audio playback engine for Jake's voice messages

---

## Overview

The voice player is the audio engine that powers Jake's voice UI. It handles playback, queueing, analytics, and state management.

**Agent 3 Responsibility:**
- Voice playback logic (Howler.js wrapper)
- Audio queue management
- Playback state tracking
- Engagement analytics
- Integration API

**NOT Agent 3 Responsibility:**
- React component UI (Agent 1)
- Visual waveform rendering (Agent 1)
- UI controls styling (Agent 1)

---

## Installation

```bash
npm install howler
npm install --save-dev @types/howler
```

---

## Integration API (for Agent 1)

### Basic Usage

```typescript
import { createVoicePlayer } from './services/jake/voice/player';

const player = createVoicePlayer();

// Play a voice message
await player.play({
  id: 'msg-001',
  script: "Alright partner, here's what I can do for ya...",
  audio_url: 'https://cdn.jakebuysit.com/voices/tier2/abc123.mp3',
  duration: 12,
  scenario: 'offer_presentation',
});

// Listen to state changes
player.on('state-change', ({ state, message }) => {
  console.log('Player state:', state);
  console.log('Current message:', message);
});
```

### Playback Controls

```typescript
// Play
await player.play(voiceMessage);

// Pause
player.pause();

// Resume
player.resume();

// Stop
player.stop();
```

### Queue Management

```typescript
// Add single message to queue
player.queue.add({
  id: 'msg-002',
  script: 'Money sent!',
  audio_url: 'https://cdn.jakebuysit.com/voices/tier1/payout_001.mp3',
  duration: 3,
});

// Add multiple messages
player.queue.add([message1, message2, message3]);

// Skip current and play next
player.queue.skip();

// Clear queue
player.queue.clear();

// Get queue length
const remaining = player.queue.getLength();
```

### State Management

```typescript
// Get current state
const state = player.getState();
// Returns: 'idle' | 'loading' | 'playing' | 'paused' | 'completed' | 'error'

// Get current message
const current = player.getCurrentMessage();
```

### Event Listeners

```typescript
// State changes
player.on('state-change', ({ state, message }) => {
  updateUI(state);
});

// Queue updates
player.on('queue-update', ({ length, queue }) => {
  console.log(`${length} messages in queue`);
});

// Current message playing
player.on('playing', ({ message, remaining }) => {
  console.log(`Playing: ${message.script}`);
  console.log(`${remaining} messages remaining`);
});

// Queue complete
player.on('queue-complete', () => {
  console.log('All messages played');
});
```

### Analytics

```typescript
// Get engagement metrics
const metrics = player.getMetrics();
console.log(metrics);
// {
//   total_plays: 15,
//   total_completions: 12,
//   completion_rate: 80,
//   avg_skip_time: 4.2
// }
```

### Cleanup

```typescript
// Destroy player instance when component unmounts
player.destroy();
```

---

## Example: React Integration (Agent 1)

```tsx
import { createVoicePlayer, VoiceMessage } from '@/services/jake/voice/player';
import { useEffect, useState } from 'react';

export function JakeVoicePlayer({ message }: { message: VoiceMessage }) {
  const [player] = useState(() => createVoicePlayer());
  const [state, setState] = useState<'idle' | 'playing' | 'paused'>('idle');

  useEffect(() => {
    // Listen to state changes
    player.on('state-change', ({ state }) => {
      setState(state);
    });

    // Cleanup on unmount
    return () => player.destroy();
  }, [player]);

  const handlePlay = () => player.play(message);
  const handlePause = () => player.pause();
  const handleResume = () => player.resume();

  return (
    <div className="jake-voice-player">
      <p>{message.script}</p>
      
      {state === 'idle' && (
        <button onClick={handlePlay}>
          Play Jake's Voice
        </button>
      )}
      
      {state === 'playing' && (
        <button onClick={handlePause}>
          Pause
        </button>
      )}
      
      {state === 'paused' && (
        <button onClick={handleResume}>
          Resume
        </button>
      )}
    </div>
  );
}
```

---

## Example: Research Animation Integration

```typescript
import { getResearchChoreography } from './services/jake/research';
import { createVoicePlayer } from './services/jake/voice/player';

const stages = getResearchChoreography(offerData);
const player = createVoicePlayer();

// Queue all 3 stages
const messages = stages.map(stage => ({
  id: `stage-${stage.stage}`,
  script: stage.script,
  audio_url: stage.audio_url || '',
  duration: stage.duration_ms / 1000,
  scenario: stage.stage,
}));

player.queue.add(messages);

// Listen for stage transitions
player.on('playing', ({ message, remaining }) => {
  console.log(`Stage: ${message.scenario}`);
  console.log(`${remaining} stages remaining`);
  
  // Trigger animation based on current stage
  if (message.scenario === 'examining') {
    triggerRiveAnimation('examining');
  }
});
```

---

## Analytics Dashboard Integration

```typescript
import { voiceAnalytics } from './services/jake/voice/player';

// Get all engagement events
const events = voiceAnalytics.getEvents();

// Send to backend for persistence (Agent 4)
await voiceAnalytics.flush('/api/v1/analytics/voice');

// Or get metrics
const metrics = voiceAnalytics.getMetrics();
console.log(`Play rate: ${metrics.completion_rate}%`);
```

---

## Events Reference

| Event | Payload | Description |
|-------|---------|-------------|
| `state-change` | `{ state, message }` | Playback state changed |
| `queue-update` | `{ length, queue }` | Queue modified |
| `playing` | `{ message, remaining }` | Message started playing |
| `queue-complete` | `{}` | All messages played |
| `error` | `{ error }` | Playback error |

---

## State Machine

```
idle → loading → playing → completed → idle
            ↓         ↓
          error     paused → playing
```

---

## Quality Criteria

✅ **Zero Latency**: Instant playback for Tier 1 pre-recorded clips  
✅ **Queue Management**: Sequential playback of multiple messages  
✅ **Analytics**: Track play/skip/complete for optimization  
✅ **Error Handling**: Graceful fallback on load failures  
✅ **Clean API**: Simple integration for Agent 1  

---

**Built by Agent 3: Jake Voice & Character System**
