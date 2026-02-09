/**
 * Voice Analytics Tracker
 * Tracks Jake voice engagement metrics for optimization
 */

import { VoiceMessage } from './voice-player.js';

export interface VoiceEngagementEvent {
  message_id: string;
  user_id?: string;
  scenario?: string;
  script: string;
  audio_url: string;
  played: boolean;
  completed: boolean;
  skipped_at?: number;
  duration: number;
  timestamp: Date;
}

export class VoiceAnalytics {
  private events: VoiceEngagementEvent[] = [];

  /**
   * Track voice message played
   */
  trackPlay(message: VoiceMessage, userId?: string): void {
    this.events.push({
      message_id: message.id,
      user_id: userId,
      scenario: message.scenario,
      script: message.script,
      audio_url: message.audio_url,
      played: true,
      completed: false,
      duration: message.duration,
      timestamp: new Date(),
    });
  }

  /**
   * Track voice message completed
   */
  trackComplete(messageId: string): void {
    const event = this.findEvent(messageId);
    if (event) {
      event.completed = true;
    }
  }

  /**
   * Track voice message skipped
   */
  trackSkip(messageId: string, skippedAtSeconds: number): void {
    const event = this.findEvent(messageId);
    if (event) {
      event.skipped_at = skippedAtSeconds;
      event.completed = false;
    }
  }

  /**
   * Get all events
   */
  getEvents(): VoiceEngagementEvent[] {
    return [...this.events];
  }

  /**
   * Get events for analytics dashboard
   */
  getMetrics(): {
    total_plays: number;
    total_completions: number;
    completion_rate: number;
    avg_skip_time: number;
  } {
    const played = this.events.filter(e => e.played);
    const completed = this.events.filter(e => e.completed);
    const skipped = this.events.filter(e => e.skipped_at !== undefined);

    const avgSkipTime = skipped.length > 0
      ? skipped.reduce((sum, e) => sum + (e.skipped_at || 0), 0) / skipped.length
      : 0;

    return {
      total_plays: played.length,
      total_completions: completed.length,
      completion_rate: played.length > 0 ? (completed.length / played.length) * 100 : 0,
      avg_skip_time: avgSkipTime,
    };
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Find event by message ID
   */
  private findEvent(messageId: string): VoiceEngagementEvent | undefined {
    return this.events.find(e => e.message_id === messageId);
  }

  /**
   * Send events to backend for persistence
   * (Integration point for Agent 4)
   */
  async flush(apiEndpoint: string): Promise<void> {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.clear();

    try {
      await fetch(apiEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ events: eventsToSend }),
      });
    } catch (error) {
      console.error('Failed to send voice analytics:', error);
      // Re-add events on failure
      this.events.unshift(...eventsToSend);
    }
  }
}

export const voiceAnalytics = new VoiceAnalytics();
