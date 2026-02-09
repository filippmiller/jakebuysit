/**
 * Jake Voice Job Handler — calls Agent 3 for script generation and TTS.
 * On success, finalizes the offer via the orchestrator.
 *
 * Fallback: if Agent 3 is unavailable, uses a Tier 1 static script
 * so the offer can still be presented (just without custom voice).
 */
import { Job } from 'bullmq';
import { agent3, type ScriptRequest } from '../../integrations/agent3-client.js';
import { offerOrchestrator } from '../../services/offer-orchestrator.js';
import { logger } from '../../utils/logger.js';

interface JakeVoiceJobData {
  offerId: string;
  scenario: string;
  itemName: string;
  offerAmount: number;
  fmv: number;
  brand: string;
  category: string;
  condition: string;
}

/** Tier 1 fallback scripts when Agent 3 is unavailable */
const FALLBACK_SCRIPTS: Record<string, { script: string; tone: string; animation_state: string }> = {
  offer_high: { script: "NOW we're talkin'! I got a real good deal for ya, partner.", tone: 'excited', animation_state: 'excited' },
  offer_standard: { script: "Alright, here's what I can do for ya.", tone: 'confident', animation_state: 'offering' },
  offer_low: { script: "Here's what I can offer, partner. Market's been tough.", tone: 'sympathetic', animation_state: 'sympathetic' },
  offer_very_low: { script: "I'll be straight with ya — market's rough on these.", tone: 'disappointed', animation_state: 'disappointed' },
};

export async function processJakeVoiceJob(job: Job<JakeVoiceJobData>): Promise<void> {
  const { offerId, scenario, itemName, offerAmount, fmv, brand, category, condition } = job.data;
  logger.info({ offerId, jobId: job.id, scenario }, 'Jake voice job started');

  try {
    // Try Agent 3 for dynamic script + voice (Tier 2/3)
    const scriptResult = await agent3.generateScript({
      scenario: scenario as ScriptRequest['scenario'],
      item_name: itemName,
      offer_amount: offerAmount,
      fmv,
      brand,
      category,
      condition,
    });

    let audioUrl: string | undefined;

    // Try voice synthesis if script generation succeeded
    try {
      const voiceResult = await agent3.generateVoice(scriptResult.script, scriptResult.tone);
      audioUrl = voiceResult.audio_url;
    } catch (voiceErr: any) {
      // Voice synthesis failed — use script without audio (Tier 2 fallback)
      logger.warn({ offerId, error: voiceErr.message }, 'Voice synthesis failed, using text-only');
    }

    await offerOrchestrator.onJakeVoiceComplete(offerId, {
      script: scriptResult.script,
      tone: scriptResult.tone,
      animation_state: scriptResult.animation_state,
      tier: audioUrl ? scriptResult.tier : 2,
      audio_url: audioUrl,
    });
  } catch (err: any) {
    logger.warn({ offerId, error: err.message }, 'Agent 3 unavailable, using Tier 1 fallback');

    // Tier 1 fallback — static script, no voice
    const fallback = FALLBACK_SCRIPTS[scenario] || FALLBACK_SCRIPTS.offer_standard;

    await offerOrchestrator.onJakeVoiceComplete(offerId, {
      script: fallback.script,
      tone: fallback.tone,
      animation_state: fallback.animation_state,
      tier: 1,
    });
  }
}
