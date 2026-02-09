/**
 * Jake Research Animation Orchestrator
 * 
 * Coordinates the 3-stage signature moment:
 * Stage A: Jake Looks (2-3s)
 * Stage B: Jake Checks Market (3-6s)
 * Stage C: Jake Decides (2-3s)
 * 
 * This is the CORE EXPERIENCE of JakeBuysIt
 */

import { EventEmitter } from 'events';
import type { OfferData, JakeAnimationState } from '../../../types/jake.js';

export type ResearchStage = 'examining' | 'researching' | 'deciding';

export interface ResearchStageEvent {
  stage: ResearchStage;
  animation_state: JakeAnimationState;
  script: string;
  audio_url?: string;
  duration: number;
  data?: Record<string, any>;
}

export interface ResearchProgress {
  stage: ResearchStage;
  progress: number; // 0-100
  message: string;
  data?: {
    // Stage B specific data
    marketplace?: string;
    sales_found?: number;
    price_range?: { min: number; max: number };
    confidence?: number;
  };
}

export class ResearchOrchestrator extends EventEmitter {
  private currentStage: ResearchStage | null = null;
  private stageStartTime: number = 0;

  /**
   * Start the research animation flow
   * Returns a promise that resolves when all stages complete
   */
  async execute(offerData: OfferData): Promise<void> {
    // Stage A: Jake Looks (Examining)
    await this.runStageA(offerData);

    // Stage B: Jake Checks Market (Researching)
    await this.runStageB(offerData);

    // Stage C: Jake Decides (Deciding)
    await this.runStageC(offerData);

    // Animation complete
    this.emit('complete', offerData);
  }

  /**
   * STAGE A: Jake Looks
   * Jake leans forward, examines photo, expression shifts by item value
   * Duration: 2-3 seconds
   */
  private async runStageA(offerData: OfferData): Promise<void> {
    this.currentStage = 'examining';
    this.stageStartTime = Date.now();

    const script = this.selectStageAScript(offerData);
    const duration = 2500; // 2.5 seconds

    this.emit('stage:start', {
      stage: 'examining',
      animation_state: 'examining',
      script,
      duration,
    } as ResearchStageEvent);

    // Simulate Jake examining the photo
    await this.sleep(500);
    this.emitProgress('examining', 30, 'Looking at the item...');

    await this.sleep(800);
    this.emitProgress('examining', 60, 'Checking condition...');

    await this.sleep(700);
    this.emitProgress('examining', 90, 'Got it...');

    await this.sleep(500);
    
    this.emit('stage:complete', { stage: 'examining' });
  }

  /**
   * STAGE B: Jake Checks Market
   * Network visualization: marketplace nodes pulse as data flows
   * Real prices stream in, counter increments
   * Duration: 3-6 seconds (depends on API response time)
   */
  private async runStageB(offerData: OfferData): Promise<void> {
    this.currentStage = 'researching';
    this.stageStartTime = Date.now();

    const script = this.selectStageBScript();
    const duration = 4000; // 4 seconds baseline

    this.emit('stage:start', {
      stage: 'researching',
      animation_state: 'researching',
      script,
      duration,
    } as ResearchStageEvent);

    // Simulate marketplace data streaming in
    // In production, this would be real API calls to Agent 2

    await this.sleep(600);
    this.emitProgress('researching', 15, "Checking eBay...", {
      marketplace: 'eBay',
      sales_found: 47,
    });

    await this.sleep(800);
    this.emitProgress('researching', 35, "Amazon data coming in...", {
      marketplace: 'Amazon',
      sales_found: 127,
    });

    await this.sleep(700);
    this.emitProgress('researching', 55, "Scanning Mercari...", {
      marketplace: 'Mercari',
      sales_found: 203,
    });

    await this.sleep(600);
    this.emitProgress('researching', 75, "Google Shopping...", {
      marketplace: 'Google',
      sales_found: 289,
      price_range: { min: 45, max: 135 },
    });

    await this.sleep(700);
    this.emitProgress('researching', 95, "Finalizing data...", {
      sales_found: 312,
      confidence: 87,
    });

    await this.sleep(600);

    this.emit('stage:complete', { stage: 'researching' });
  }

  /**
   * STAGE C: Jake Decides
   * Data converges, price histogram builds, Jake's offer materializes
   * Jake's reaction matches offer quality
   * Duration: 2-3 seconds
   */
  private async runStageC(offerData: OfferData): Promise<void> {
    this.currentStage = 'deciding';
    this.stageStartTime = Date.now();

    const script = this.selectStageCScript(offerData);
    const animationState = this.getDecidingAnimationState(offerData);
    const duration = 2500;

    this.emit('stage:start', {
      stage: 'deciding',
      animation_state: animationState,
      script,
      duration,
      data: {
        offer: offerData.offer,
        fmv: offerData.fmv,
      },
    } as ResearchStageEvent);

    await this.sleep(800);
    this.emitProgress('deciding', 30, 'Crunching numbers...');

    await this.sleep(900);
    this.emitProgress('deciding', 70, 'Calculating offer...');

    await this.sleep(800);
    this.emitProgress('deciding', 100, 'Got your price!');

    this.emit('stage:complete', { stage: 'deciding' });
  }

  /**
   * Select Stage A script based on item data
   */
  private selectStageAScript(offerData: OfferData): string {
    const scripts = [
      "Alright, let's see what we got here...",
      "Lemme get a good look at this...",
      "Ohhh, interesting...",
      `${offerData.brand}... nice...`,
    ];

    return scripts[Math.floor(Math.random() * scripts.length)];
  }

  /**
   * Select Stage B script (researching)
   */
  private selectStageBScript(): string {
    const scripts = [
      "Checkin' eBay... Amazon... seein' what these are sellin' for...",
      "Hang tight, partner. Lookin' up recent sales on this one...",
      "Let me check what the market's sayin'...",
    ];

    return scripts[Math.floor(Math.random() * scripts.length)];
  }

  /**
   * Select Stage C script based on offer quality
   */
  private selectStageCScript(offerData: OfferData): string {
    const ratio = offerData.offer / offerData.fmv;

    if (ratio >= 0.7) {
      return "NOW we're talkin'...";
    } else if (ratio >= 0.5) {
      return "Alright, got your number...";
    } else {
      return "Here's what I can do...";
    }
  }

  /**
   * Get animation state for deciding stage based on offer
   */
  private getDecidingAnimationState(offerData: OfferData): JakeAnimationState {
    const ratio = offerData.offer / offerData.fmv;

    if (ratio >= 0.7) return 'excited';
    if (ratio >= 0.5) return 'offering';
    if (ratio >= 0.3) return 'sympathetic';
    return 'disappointed';
  }

  /**
   * Emit progress update
   */
  private emitProgress(
    stage: ResearchStage,
    progress: number,
    message: string,
    data?: Record<string, any>
  ): void {
    this.emit('progress', {
      stage,
      progress,
      message,
      data,
    } as ResearchProgress);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current stage
   */
  getCurrentStage(): ResearchStage | null {
    return this.currentStage;
  }

  /**
   * Get elapsed time for current stage
   */
  getElapsedTime(): number {
    if (!this.stageStartTime) return 0;
    return Date.now() - this.stageStartTime;
  }
}

/**
 * Singleton instance
 */
export const researchOrchestrator = new ResearchOrchestrator();
