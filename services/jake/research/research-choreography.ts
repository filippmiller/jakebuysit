/**
 * Jake Research Animation Choreography
 * 
 * Agent 3 Responsibility: Define Jake's voice and animation behavior
 * during the 3-stage research flow
 * 
 * Integration: Agent 1 (Frontend) consumes this to drive UI
 */

import { selectTemplate, fillTemplate } from '../data/templates/script-library.js';
import { animationOrchestrator } from '../animation/animation-orchestrator.js';
import type { 
  OfferData, 
  JakeAnimationState, 
  JakeTone,
  ScenarioType 
} from '../../../types/jake.js';

export interface ResearchStage {
  stage: 'examining' | 'researching' | 'deciding';
  script: string;
  audio_url?: string;
  animation_state: JakeAnimationState;
  tone: JakeTone;
  duration_ms: number;
  substeps?: ResearchSubstep[];
}

export interface ResearchSubstep {
  timestamp_ms: number;
  message: string;
  animation_hint?: 'lean_forward' | 'eyes_scan' | 'nod' | 'smile' | 'frown';
}

export class ResearchChoreography {
  /**
   * Generate complete 3-stage choreography for a research session
   * This is the primary integration point for Agent 1
   */
  generateChoreography(offerData: OfferData): ResearchStage[] {
    return [
      this.getStageA_Examining(offerData),
      this.getStageB_Researching(offerData),
      this.getStageC_Deciding(offerData),
    ];
  }

  /**
   * STAGE A: Jake Examines
   * Duration: 2-3 seconds
   * Animation: Jake leans forward, squints, expression shifts
   */
  private getStageA_Examining(offerData: OfferData): ResearchStage {
    const scripts = [
      "Alright, let's see what we got here...",
      "Lemme get a good look at this...",
      "Ohhh, interesting...",
      `${offerData.brand}... nice...`,
      `${offerData.category}... I know these...`,
    ];

    const script = this.selectRandom(scripts);

    return {
      stage: 'examining',
      script,
      animation_state: 'examining',
      tone: 'neutral',
      duration_ms: 2500,
      substeps: [
        {
          timestamp_ms: 0,
          message: 'Looking at the item...',
          animation_hint: 'lean_forward',
        },
        {
          timestamp_ms: 800,
          message: 'Checking condition...',
          animation_hint: 'eyes_scan',
        },
        {
          timestamp_ms: 1800,
          message: 'Got it...',
          animation_hint: 'nod',
        },
      ],
    };
  }

  /**
   * STAGE B: Jake Researches Market
   * Duration: 4-6 seconds
   * Animation: Hand on chin, eyes scanning, thoughtful
   */
  private getStageB_Researching(offerData: OfferData): ResearchStage {
    const scripts = [
      "Checkin' eBay... Amazon... seein' what these are sellin' for...",
      "Hang tight, partner. Lookin' up recent sales on this one...",
      "Let me check what the market's sayin'...",
      "Pullin' up sold listings... give me a sec...",
    ];

    const script = this.selectRandom(scripts);

    return {
      stage: 'researching',
      script,
      animation_state: 'researching',
      tone: 'confident',
      duration_ms: 4000,
      substeps: [
        {
          timestamp_ms: 0,
          message: "Checking eBay...",
        },
        {
          timestamp_ms: 1000,
          message: "Amazon data coming in...",
        },
        {
          timestamp_ms: 2000,
          message: "Scanning Mercari...",
        },
        {
          timestamp_ms: 3000,
          message: "Google Shopping...",
        },
        {
          timestamp_ms: 3500,
          message: `Found ${offerData.comparables} sales...`,
        },
      ],
    };
  }

  /**
   * STAGE C: Jake Decides
   * Duration: 2-3 seconds
   * Animation: Varies by offer quality (excited/confident/sympathetic)
   */
  private getStageC_Deciding(offerData: OfferData): ResearchStage {
    const ratio = offerData.offer / offerData.fmv;
    
    let script: string;
    let tone: JakeTone;
    let animationState: JakeAnimationState;
    let animationHint: 'smile' | 'nod' | 'frown';

    if (ratio >= 0.7) {
      // High offer - Jake is excited
      script = "NOW we're talkin'...";
      tone = 'excited';
      animationState = 'excited';
      animationHint = 'smile';
    } else if (ratio >= 0.5) {
      // Standard offer - Jake is confident
      script = "Alright, got your number...";
      tone = 'confident';
      animationState = 'offering';
      animationHint = 'nod';
    } else if (ratio >= 0.3) {
      // Low offer - Jake is sympathetic
      script = "Here's what I can do...";
      tone = 'sympathetic';
      animationState = 'sympathetic';
      animationHint = 'frown';
    } else {
      // Very low - Jake is disappointed
      script = "Market's rough on these...";
      tone = 'disappointed';
      animationState = 'disappointed';
      animationHint = 'frown';
    }

    return {
      stage: 'deciding',
      script,
      animation_state: animationState,
      tone,
      duration_ms: 2500,
      substeps: [
        {
          timestamp_ms: 0,
          message: 'Crunching numbers...',
        },
        {
          timestamp_ms: 1000,
          message: 'Calculating offer...',
        },
        {
          timestamp_ms: 2000,
          message: 'Got your price!',
          animation_hint: animationHint,
        },
      ],
    };
  }

  /**
   * Get total duration for all stages
   */
  getTotalDuration(choreography: ResearchStage[]): number {
    return choreography.reduce((sum, stage) => sum + stage.duration_ms, 0);
  }

  /**
   * Utility: Select random item from array
   */
  private selectRandom<T>(items: T[]): T {
    return items[Math.floor(Math.random() * items.length)];
  }
}

/**
 * Singleton instance
 */
export const researchChoreography = new ResearchChoreography();
