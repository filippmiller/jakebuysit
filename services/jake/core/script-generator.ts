/**
 * Jake Script Generator
 * 
 * Uses Claude API to generate character-appropriate scripts
 * for dynamic scenarios (Tier 3)
 */

import Anthropic from '@anthropic-ai/sdk';
import { JAKE_CHARACTER } from './character-bible.js';
import { consistencyChecker } from './consistency-checker.js';
import type {
  ScriptGenerationRequest,
  ScriptGenerationResult,
  JakeTone
} from '../../../types/jake.js';

export class ScriptGenerator {
  private client: Anthropic;
  private maxRetries = 3;

  constructor(apiKey?: string) {
    this.client = new Anthropic({
      apiKey: apiKey || process.env.ANTHROPIC_API_KEY,
    });
  }

  /**
   * Generate a Jake-style script using Claude
   */
  async generate(request: ScriptGenerationRequest): Promise<ScriptGenerationResult> {
    let attempt = 0;
    let lastError: Error | null = null;

    while (attempt < this.maxRetries) {
      try {
        const script = await this.generateScript(request);
        const tone = request.tone || this.inferTone(request.data);
        
        // Check character consistency
        const check = consistencyChecker.check(script, tone);

        if (check.passed) {
          return {
            script,
            tone,
            estimated_duration: this.estimateDuration(script),
            tier_recommended: 3,
            variables_filled: {},
            character_check_passed: true,
          };
        }

        // If check failed, retry
        console.warn(`Consistency check failed (attempt ${attempt + 1}):`, check.violations);
        attempt++;
        
      } catch (error) {
        lastError = error as Error;
        attempt++;
        console.error(`Script generation failed (attempt ${attempt}):`, error);
      }
    }

    throw new Error(
      `Failed to generate compliant script after ${this.maxRetries} attempts: ${lastError?.message}`
    );
  }

  /**
   * Generate script using Claude API
   */
  private async generateScript(request: ScriptGenerationRequest): Promise<string> {
    const systemPrompt = this.buildSystemPrompt();
    const userPrompt = this.buildUserPrompt(request);

    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 200,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: userPrompt,
        },
      ],
    });

    const content = message.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    return content.text.trim();
  }

  /**
   * Build system prompt with character bible
   */
  private buildSystemPrompt(): string {
    return `You are Jake, a western-style pawn shop owner with a warm baritone voice and slight Texas drawl.

CORE IDENTITY:
- Age: ${JAKE_CHARACTER.age}
- Voice: ${JAKE_CHARACTER.voice.tone} with ${JAKE_CHARACTER.voice.accent}
- Reference: ${JAKE_CHARACTER.voice.reference}

PERSONALITY:
${Object.entries(JAKE_CHARACTER.traits).map(([key, value]) => `- ${key}: ${value}`).join('\n')}

SPEECH PATTERNS:
- Use contractions: ${JAKE_CHARACTER.speech.contractions.slice(0, 6).join(', ')}
- Address terms: ${JAKE_CHARACTER.speech.address.join(', ')}
- Signature phrases: ${JAKE_CHARACTER.speech.signatures.slice(0, 3).join('; ')}

CRITICAL RULES:
- ALWAYS under ${JAKE_CHARACTER.brevity.max_total} words
- NEVER use: ${JAKE_CHARACTER.banned.slice(0, 4).join('; ')}
- Direct, funny, rough around edges, but genuinely fair
- No corporate speak, no technical jargon, no condescension

Generate a short, memorable, shareable Jake message. Make it sound like it's coming from a real person, not an AI.`;
  }

  /**
   * Build user prompt from request data
   */
  private buildUserPrompt(request: ScriptGenerationRequest): string {
    const { scenario, data, tone } = request;

    let prompt = `Generate a ${scenario} message`;

    if (tone) {
      prompt += ` with ${tone} tone`;
    }

    prompt += ` for:\n\n`;

    // Add relevant data
    if ('item' in data) {
      prompt += `Item: ${data.item}\n`;
    }
    if ('offer' in data && 'fmv' in data) {
      prompt += `Offer: $${data.offer} (Market value: $${data.fmv})\n`;
    }
    if ('confidence' in data) {
      prompt += `Confidence: ${data.confidence}%\n`;
    }
    if ('comparables' in data) {
      prompt += `Comparables checked: ${data.comparables}\n`;
    }

    prompt += `\nKeep it under 25 words. Make it memorable and shareable.`;

    return prompt;
  }

  /**
   * Infer tone from offer data
   */
  private inferTone(data: Record<string, any>): JakeTone {
    if ('offer' in data && 'fmv' in data) {
      const ratio = data.offer / data.fmv;
      
      if (ratio >= 0.7) return 'excited';  // High offer
      if (ratio >= 0.5) return 'confident'; // Standard
      if (ratio >= 0.3) return 'sympathetic'; // Low but reasonable
      return 'disappointed'; // Very low
    }

    return 'neutral';
  }

  /**
   * Estimate audio duration from script
   * Assumes ~150 words per minute for Jake's drawl
   */
  private estimateDuration(script: string): number {
    const wordCount = script.split(/\s+/).length;
    const wordsPerMinute = 150;
    return Math.ceil((wordCount / wordsPerMinute) * 60); // seconds
  }
}

/**
 * Singleton instance
 */
export const scriptGenerator = new ScriptGenerator();
