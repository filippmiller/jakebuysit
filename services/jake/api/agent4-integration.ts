/**
 * Agent 4 Integration Routes
 * 
 * API endpoints matching the contract defined in backend/src/integrations/agent3-client.ts
 * These are called by Agent 4's offer orchestrator
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { scriptGenerator } from '../core/script-generator.js';
import { ttsService } from '../voice/tts-service.js';
import { selectTemplate, fillTemplate } from '../data/templates/script-library.js';
import { TONE_TO_ANIMATION } from '../core/character-bible.js';
import type { JakeTone, ScenarioType } from '../../../types/jake.js';

// Request/Response types matching Agent 4 contract
interface ScriptRequest {
  scenario: 'offer_high' | 'offer_standard' | 'offer_low' | 'offer_very_low' | 'greeting' | 'research';
  item_name: string;
  offer_amount?: number;
  fmv?: number;
  brand?: string;
  category?: string;
  condition?: string;
  user_familiarity?: 'new' | 'returning' | 'regular' | 'vip';
}

interface ScriptResult {
  script: string;
  tone: string;
  animation_state: string;
  tier: 1 | 2 | 3;
}

interface VoiceResult {
  audio_url: string;
  duration_ms: number;
  tier: 1 | 2 | 3;
}

export async function registerAgent4Routes(fastify: FastifyInstance) {
  /**
   * POST /api/v1/generate-script
   * Generate Jake script for a given scenario
   */
  fastify.post('/api/v1/generate-script', async (
    request: FastifyRequest<{ Body: ScriptRequest }>,
    reply: FastifyReply
  ) => {
    const req = request.body;

    try {
      // Map Agent 4 scenario to Jake scenario type
      const scenario = mapScenario(req.scenario);
      const tone = determineTone(req);

      // Try template first (Tier 1 or 2)
      const template = selectTemplate(scenario, req);

      let script: string;
      let tier: 1 | 2 | 3;

      if (template && template.tier <= 2) {
        // Use template
        script = fillTemplate(template, {
          ITEM: req.item_name,
          PRICE: req.offer_amount?.toString() || '',
          FMV: req.fmv?.toString() || '',
          BRAND: req.brand || '',
          CATEGORY: req.category || '',
        });
        tier = template.tier as 1 | 2;
      } else {
        // Generate dynamically (Tier 3)
        const result = await scriptGenerator.generate({
          scenario,
          tone,
          data: {
            offerId: 'temp',
            item: req.item_name,
            brand: req.brand || '',
            category: req.category || '',
            fmv: req.fmv || 0,
            offer: req.offer_amount || 0,
            confidence: 85,
            comparables: 100,
            condition: req.condition || 'Good',
          },
        });

        script = result.script;
        tier = 3;
      }

      // Get animation state from tone
      const animation_state = TONE_TO_ANIMATION[tone] || 'idle';

      const response: ScriptResult = {
        script,
        tone,
        animation_state,
        tier,
      };

      return reply.code(200).send(response);

    } catch (error) {
      request.log.error({ error, body: req }, 'Script generation failed');
      return reply.code(500).send({
        error: 'Script generation failed',
        message: (error as Error).message,
      });
    }
  });

  /**
   * POST /api/v1/generate-voice
   * Synthesize voice audio from script
   */
  fastify.post('/api/v1/generate-voice', async (
    request: FastifyRequest<{ Body: { script: string; tone: string } }>,
    reply: FastifyReply
  ) => {
    const { script, tone } = request.body;

    try {
      // Synthesize voice using TTS service
      const result = await ttsService.synthesize({
        script,
        tone: tone as JakeTone,
        priority: 'normal',
      });

      const response: VoiceResult = {
        audio_url: result.audio_url,
        duration_ms: result.duration * 1000,
        tier: 2, // TTS is always Tier 2
      };

      return reply.code(200).send(response);

    } catch (error) {
      request.log.error({ error, script, tone }, 'Voice synthesis failed');
      return reply.code(500).send({
        error: 'Voice synthesis failed',
        message: (error as Error).message,
      });
    }
  });

  /**
   * GET /api/v1/health
   * Health check for Agent 4 to verify Agent 3 is running
   */
  fastify.get('/api/v1/health', async (request, reply) => {
    return reply.code(200).send({
      status: 'ok',
      agent: 'Agent 3 - Jake Voice & Character',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });
}

/**
 * Map Agent 4 scenario names to Jake scenario types
 */
function mapScenario(scenario: string): ScenarioType {
  const mapping: Record<string, ScenarioType> = {
    offer_high: 'offer_high_value',
    offer_standard: 'offer_standard',
    offer_low: 'offer_low_value',
    offer_very_low: 'offer_low_value',
    greeting: 'greeting_first',
    research: 'researching',
  };

  return mapping[scenario] || 'offer_standard';
}

/**
 * Determine tone from request data
 */
function determineTone(req: ScriptRequest): JakeTone {
  if (!req.offer_amount || !req.fmv) return 'neutral';

  const ratio = req.offer_amount / req.fmv;

  if (ratio >= 0.7) return 'excited';
  if (ratio >= 0.5) return 'confident';
  if (ratio >= 0.3) return 'sympathetic';
  return 'disappointed';
}
