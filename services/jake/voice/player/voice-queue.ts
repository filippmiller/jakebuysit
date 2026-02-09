/**
 * Voice Queue Manager
 * Handles sequential playback of multiple Jake voice messages
 */

import { VoicePlayer, VoiceMessage } from './voice-player.js';
import { EventEmitter } from 'events';

export class VoiceQueue extends EventEmitter {
  private player: VoicePlayer;
  private queue: VoiceMessage[] = [];
  private isPlaying: boolean = false;

  constructor(player: VoicePlayer) {
    super();
    this.player = player;

    // Listen to player completion events
    this.player.on('state-change', ({ state }) => {
      if (state === 'completed') {
        this.playNext();
      }
    });
  }

  /**
   * Add message(s) to queue
   */
  add(messages: VoiceMessage | VoiceMessage[]): void {
    const toAdd = Array.isArray(messages) ? messages : [messages];
    this.queue.push(...toAdd);
    this.emit('queue-update', { length: this.queue.length, queue: this.queue });

    // Auto-start if not playing
    if (!this.isPlaying && this.queue.length > 0) {
      this.playNext();
    }
  }

  /**
   * Play next message in queue
   */
  private async playNext(): Promise<void> {
    if (this.queue.length === 0) {
      this.isPlaying = false;
      this.emit('queue-complete');
      return;
    }

    this.isPlaying = true;
    const next = this.queue.shift()!;
    
    this.emit('playing', { message: next, remaining: this.queue.length });
    await this.player.play(next);
  }

  /**
   * Skip current and play next
   */
  skip(): void {
    this.player.stop();
    this.playNext();
  }

  /**
   * Clear entire queue
   */
  clear(): void {
    this.queue = [];
    this.player.stop();
    this.isPlaying = false;
    this.emit('queue-update', { length: 0, queue: [] });
  }

  /**
   * Get queue length
   */
  getLength(): number {
    return this.queue.length;
  }

  /**
   * Get current queue
   */
  getQueue(): VoiceMessage[] {
    return [...this.queue];
  }
}
