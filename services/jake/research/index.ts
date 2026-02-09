/**
 * Jake Research Animation - Integration API
 * 
 * Agent 3 Export: Voice + Animation choreography for research stages
 * 
 * INTEGRATION POINT for Agent 1 (Frontend):
 * 
 * import { getResearchChoreography } from 'services/jake/research';
 * 
 * const stages = getResearchChoreography(offerData);
 * // Returns 3 stages with scripts, animation states, timing
 */

import { researchChoreography, type ResearchStage } from './research-choreography.js';
import { selectStageScript, RESEARCH_STAGE_SCRIPTS } from './stage-scripts.js';
import type { OfferData } from '../../../types/jake.js';

/**
 * PRIMARY INTEGRATION FUNCTION
 * 
 * Agent 1 calls this to get Jake's complete research choreography
 */
export function getResearchChoreography(offerData: OfferData): ResearchStage[] {
  return researchChoreography.generateChoreography(offerData);
}

/**
 * Get pre-recorded audio URL for a stage
 * Returns Tier 1 (instant playback) audio clips
 */
export function getStageAudioUrl(
  stage: 'examining' | 'researching' | 'deciding',
  offerQuality?: 'excited' | 'confident' | 'sympathetic' | 'disappointed'
): string {
  if (stage === 'examining') {
    return selectStageScript('examining').audio_url;
  }
  
  if (stage === 'researching') {
    return selectStageScript('researching').audio_url;
  }
  
  // Deciding stage depends on offer quality
  const decidingStage = `deciding_${offerQuality || 'confident'}` as keyof typeof RESEARCH_STAGE_SCRIPTS;
  return selectStageScript(decidingStage).audio_url;
}

/**
 * Get total animation duration (for progress bars, etc.)
 */
export function getTotalResearchDuration(offerData: OfferData): number {
  const stages = getResearchChoreography(offerData);
  return researchChoreography.getTotalDuration(stages);
}

/**
 * Re-export types for convenience
 */
export type { ResearchStage, ResearchSubstep } from './research-choreography.js';
