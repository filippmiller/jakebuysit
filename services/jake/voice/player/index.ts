/**
 * Jake Voice Player - Integration API
 * 
 * Agent 3 Export: Voice playback engine for Agent 1 to consume
 * 
 * USAGE (Agent 1):
 * import { createVoicePlayer } from 'services/jake/voice/player';
 * 
 * const player = createVoicePlayer();
 * await player.play({ id, script, audio_url, duration });
 */

import { VoicePlayer, VoiceMessage, PlaybackState } from './voice-player.js';
import { VoiceQueue } from './voice-queue.js';
import { VoiceAnalytics, voiceAnalytics } from './voice-analytics.js';

export interface VoicePlayerInstance {
  // Playback controls
  play: (message: VoiceMessage) => Promise<void>;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  
  // Queue management
  queue: {
    add: (messages: VoiceMessage | VoiceMessage[]) => void;
    skip: () => void;
    clear: () => void;
    getLength: () => number;
  };
  
  // State
  getState: () => PlaybackState;
  getCurrentMessage: () => VoiceMessage | null;
  
  // Events
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler: (...args: any[]) => void) => void;
  
  // Analytics
  getMetrics: () => any;
  
  // Cleanup
  destroy: () => void;
}

/**
 * Create a voice player instance
 * PRIMARY INTEGRATION FUNCTION for Agent 1
 */
export function createVoicePlayer(): VoicePlayerInstance {
  const player = new VoicePlayer();
  const queue = new VoiceQueue(player);
  const analytics = new VoiceAnalytics();

  // Track analytics events
  player.on('state-change', ({ state, message }) => {
    if (state === 'playing' && message) {
      analytics.trackPlay(message);
    } else if (state === 'completed' && message) {
      analytics.trackComplete(message.id);
    }
  });

  return {
    // Playback
    play: (message) => player.play(message),
    pause: () => player.pause(),
    resume: () => player.resume(),
    stop: () => player.stop(),

    // Queue
    queue: {
      add: (messages) => queue.add(messages),
      skip: () => queue.skip(),
      clear: () => queue.clear(),
      getLength: () => queue.getLength(),
    },

    // State
    getState: () => player.getState(),
    getCurrentMessage: () => player['currentMessage'],

    // Events
    on: (event, handler) => {
      player.on(event, handler);
      queue.on(event, handler);
    },
    off: (event, handler) => {
      player.off(event, handler);
      queue.off(event, handler);
    },

    // Analytics
    getMetrics: () => analytics.getMetrics(),

    // Cleanup
    destroy: () => {
      player.stop();
      queue.clear();
      analytics.clear();
    },
  };
}

/**
 * Re-export types
 */
export type { VoiceMessage, PlaybackState, VoiceEngagementEvent } from './voice-player.js';
export { voiceAnalytics } from './voice-analytics.js';
