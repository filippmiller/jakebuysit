/**
 * Jake Voice Player - Core audio playback service
 */

import { Howl, Howler } from 'howler';
import { EventEmitter } from 'events';

export type PlaybackState = 'idle' | 'loading' | 'playing' | 'paused' | 'completed' | 'error';

export interface VoiceMessage {
  id: string;
  script: string;
  audio_url: string;
  duration: number;
  scenario?: string;
}

export class VoicePlayer extends EventEmitter {
  private currentSound: Howl | null = null;
  private currentMessage: VoiceMessage | null = null;
  private state: PlaybackState = 'idle';
  private queue: VoiceMessage[] = [];

  async play(message: VoiceMessage): Promise<void> {
    if (this.currentSound) {
      this.stop();
    }

    this.currentMessage = message;
    this.state = 'loading';

    this.currentSound = new Howl({
      src: [message.audio_url],
      html5: true,
      onload: () => this.setState('playing'),
      onplay: () => this.setState('playing'),
      onpause: () => this.setState('paused'),
      onend: () => this.setState('completed'),
      onerror: () => this.setState('error'),
    });

    this.currentSound.play();
  }

  pause(): void {
    if (this.currentSound) this.currentSound.pause();
  }

  resume(): void {
    if (this.currentSound) this.currentSound.play();
  }

  stop(): void {
    if (this.currentSound) {
      this.currentSound.stop();
      this.currentSound.unload();
      this.currentSound = null;
    }
    this.state = 'idle';
  }

  getState(): PlaybackState {
    return this.state;
  }

  private setState(state: PlaybackState): void {
    this.state = state;
    this.emit('state-change', { state, message: this.currentMessage });
  }
}

export const voicePlayer = new VoicePlayer();
