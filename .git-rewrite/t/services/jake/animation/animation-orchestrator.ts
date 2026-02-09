/**
 * Animation Orchestrator
 * 
 * Maps Jake's tone to Rive animation states
 * Provides state machine triggers for frontend
 */

import { TONE_TO_ANIMATION } from '../core/character-bible.js';
import type { JakeTone, JakeAnimationState } from '../../../types/jake.js';

export class AnimationOrchestrator {
  /**
   * Get animation state for a given tone
   */
  getStateForTone(tone: JakeTone): JakeAnimationState {
    return TONE_TO_ANIMATION[tone] || 'idle';
  }

  /**
   * Get animation duration based on state
   */
  getDuration(state: JakeAnimationState): number {
    const durations: Record<JakeAnimationState, number> = {
      idle: 0,
      examining: 2000,
      researching: 4000,
      excited: 3000,
      offering: 2500,
      celebrating: 3500,
      sympathetic: 3000,
      disappointed: 2500,
      suspicious: 3000,
      thinking: 3500,
    };

    return durations[state] || 3000;
  }

  /**
   * Create animation trigger payload for frontend
   */
  createTrigger(tone: JakeTone, context?: Record<string, any>) {
    const state = this.getStateForTone(tone);
    const duration = this.getDuration(state);

    return {
      state,
      duration,
      context: context || {},
    };
  }

  /**
   * Synchronize animation with voice duration
   * If voice is longer than default animation, extend animation duration
   */
  syncWithVoice(tone: JakeTone, voiceDuration: number) {
    const state = this.getStateForTone(tone);
    const defaultDuration = this.getDuration(state);

    // Voice duration in milliseconds
    const voiceDurationMs = voiceDuration * 1000;

    // Use whichever is longer
    const syncedDuration = Math.max(defaultDuration, voiceDurationMs);

    return {
      state,
      duration: syncedDuration,
      voice_duration: voiceDurationMs,
    };
  }
}

/**
 * Singleton instance
 */
export const animationOrchestrator = new AnimationOrchestrator();
