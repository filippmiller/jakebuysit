/**
 * Jake Service - Main Coordinator
 * 
 * Orchestrates script generation, voice synthesis, and animation
 * This is the primary interface for other agents to interact with Jake
 */

import { scriptGenerator } from './core/script-generator.js';
import { ttsService } from './voice/tts-service.js';
import { animationOrchestrator } from './animation/animation-orchestrator.js';
import { selectTemplate, fillTemplate } from './data/templates/script-library.js';
import type {
  ScenarioType,
  OfferData,
  UserData,
  JakeResponse,
  JakeTone,
  VoiceTier
} from '../../types/jake.js';

export class JakeService {
  /**
   * Present an offer with Jake's personality
   * This is the PRIMARY integration point for Agent 2 (Pricing Engine)
   */
  async presentOffer(offerData: OfferData, userData?: UserData): Promise<JakeResponse> {
    // Determine scenario and tone
    const scenario = this.selectScenario(offerData);
    const tone = this.determineTone(offerData);

    // Try Tier 1 (pre-recorded) or Tier 2 (template) first
    const template = selectTemplate(scenario, offerData);

    let script: string;
    let tier: VoiceTier;
    let audioUrl: string | undefined;

    if (template && template.tier <= 2) {
      // Use template
      script = fillTemplate(template, {
        ITEM: offerData.item,
        PRICE: offerData.offer.toString(),
        FMV: offerData.fmv.toString(),
        COMPARABLES: offerData.comparables.toString(),
        BRAND: offerData.brand,
      });
      tier = template.tier;

      // Generate voice for Tier 2
      if (tier === 2) {
        const voiceResult = await ttsService.synthesize({
          script,
          tone,
          priority: 'high',
        });
        audioUrl = voiceResult.audio_url;
      }
    } else {
      // Fall back to Tier 3 (dynamic generation)
      const result = await scriptGenerator.generate({
        scenario,
        tone,
        data: offerData,
        tier_preference: 3,
      });

      script = result.script;
      tier = 3;

      // Generate voice
      const voiceResult = await ttsService.synthesize({
        script,
        tone,
        priority: 'normal',
      });
      audioUrl = voiceResult.audio_url;
    }

    // Get animation state
    const animationState = animationOrchestrator.getStateForTone(tone);
    const duration = this.estimateDuration(script);
    const animationDuration = animationOrchestrator.getDuration(animationState);

    return {
      script,
      audio_url: audioUrl,
      animation_state: animationState,
      animation_duration: animationDuration,
      tone,
      duration,
      tier_used: tier,
    };
  }

  /**
   * Generate a greeting based on user familiarity
   */
  async greet(userData: UserData): Promise<JakeResponse> {
    const scenario = this.selectGreetingScenario(userData.jake_familiarity);
    const template = selectTemplate(scenario);

    if (!template) {
      throw new Error('No greeting template found');
    }

    const script = fillTemplate(template, {
      NAME: userData.name,
    });

    // Greetings are always Tier 1 (pre-recorded)
    return {
      script,
      audio_url: undefined, // Pre-recorded clip URL would come from CDN
      animation_state: 'idle',
      animation_duration: 2000,
      tone: template.tone,
      duration: this.estimateDuration(script),
      tier_used: 1,
    };
  }

  /**
   * Generate shipping instructions
   */
  async shipInstructions(): Promise<JakeResponse> {
    const template = selectTemplate('shipping_instructions');
    
    if (!template) {
      throw new Error('No shipping template found');
    }

    const script = template.template;

    return {
      script,
      audio_url: undefined,
      animation_state: 'offering',
      animation_duration: 2500,
      tone: template.tone,
      duration: this.estimateDuration(script),
      tier_used: 1,
    };
  }

  /**
   * Confirm payout sent
   */
  async payoutSent(amount: number, method: string): Promise<JakeResponse> {
    const template = selectTemplate('payout_sent');
    
    if (!template) {
      throw new Error('No payout template found');
    }

    const script = fillTemplate(template, {
      AMOUNT: amount.toString(),
      METHOD: method,
    });

    // Generate voice for Tier 2
    const voiceResult = await ttsService.synthesize({
      script,
      tone: 'excited',
      priority: 'normal',
    });

    return {
      script,
      audio_url: voiceResult.audio_url,
      animation_state: 'celebrating',
      animation_duration: 3500,
      tone: 'excited',
      duration: voiceResult.duration,
      tier_used: 2,
    };
  }

  /**
   * Select scenario based on offer data
   */
  private selectScenario(offerData: OfferData): ScenarioType {
    const ratio = offerData.offer / offerData.fmv;

    if (ratio >= 0.7) return 'offer_high_value';
    if (ratio >= 0.3) return 'offer_standard';
    return 'offer_low_value';
  }

  /**
   * Determine tone from offer data
   */
  private determineTone(offerData: OfferData): JakeTone {
    const ratio = offerData.offer / offerData.fmv;

    if (ratio >= 0.7) return 'excited';
    if (ratio >= 0.5) return 'confident';
    if (ratio >= 0.3) return 'sympathetic';
    return 'disappointed';
  }

  /**
   * Select greeting scenario based on user familiarity
   */
  private selectGreetingScenario(familiarity: string): ScenarioType {
    switch (familiarity) {
      case 'vip':
        return 'greeting_vip';
      case 'returning':
      case 'regular':
        return 'greeting_returning';
      default:
        return 'greeting_first';
    }
  }

  /**
   * Estimate duration from script
   */
  private estimateDuration(script: string): number {
    const wordCount = script.split(/\s+/).length;
    return Math.ceil((wordCount / 150) * 60);
  }
}

/**
 * Singleton instance
 */
export const jakeService = new JakeService();
