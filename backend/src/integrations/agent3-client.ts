/**
 * Agent 3 Integration Client — Jake Voice & Character System
 * Calls the Jake service for script generation and voice synthesis.
 */
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const BASE_URL = config.agents.agent3Url;
const TIMEOUT_MS = 15_000;

export interface ScriptRequest {
  scenario: 'offer_high' | 'offer_standard' | 'offer_low' | 'offer_very_low' | 'greeting' | 'research';
  item_name: string;
  offer_amount?: number;
  fmv?: number;
  brand?: string;
  category?: string;
  condition?: string;
  user_familiarity?: 'new' | 'returning' | 'regular' | 'vip';
}

export interface ScriptResult {
  script: string;
  tone: string;
  animation_state: string;
  tier: 1 | 2 | 3;
}

export interface VoiceResult {
  audio_url: string;
  duration_ms: number;
  tier: 1 | 2 | 3;
}

async function agent3Fetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    logger.info({ url }, 'Calling Agent 3');

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Agent 3 responded ${res.status}: ${text}`);
    }

    const data = (await res.json()) as T;
    logger.info({ url, status: res.status }, 'Agent 3 response OK');
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Agent 3 timeout after ${TIMEOUT_MS}ms on ${path}`);
    }
    logger.error({ url, error: err.message }, 'Agent 3 call failed');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const agent3 = {
  /** Generate a Jake script for a given scenario */
  async generateScript(request: ScriptRequest): Promise<ScriptResult> {
    return agent3Fetch<ScriptResult>('/api/v1/generate-script', request as any);
  },

  /** Synthesize voice audio from a script */
  async generateVoice(script: string, tone: string): Promise<VoiceResult> {
    return agent3Fetch<VoiceResult>('/api/v1/generate-voice', { script, tone });
  },
};
