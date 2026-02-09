/**
 * Jake Research Stage Scripts
 * 
 * Pre-written voice scripts for each research stage
 * Tier 1 (pre-recorded clips) for instant playback
 */

export const RESEARCH_STAGE_SCRIPTS = {
  // STAGE A: EXAMINING (2-3s)
  examining: [
    {
      id: 'exam_research_001',
      script: "Alright, let's see what we got here...",
      audio_url: 'tier1/examining/exam_001.mp3',
      duration: 2.1,
    },
    {
      id: 'exam_research_002',
      script: "Lemme get a good look at this...",
      audio_url: 'tier1/examining/exam_002.mp3',
      duration: 1.9,
    },
    {
      id: 'exam_research_003',
      script: "Ohhh, interesting...",
      audio_url: 'tier1/examining/exam_003.mp3',
      duration: 1.5,
    },
    {
      id: 'exam_research_004',
      script: "Nice... real nice...",
      audio_url: 'tier1/examining/exam_004.mp3',
      duration: 1.8,
    },
  ],

  // STAGE B: RESEARCHING (4-6s)
  researching: [
    {
      id: 'research_001',
      script: "Checkin' eBay... Amazon... seein' what these are sellin' for...",
      audio_url: 'tier1/researching/research_001.mp3',
      duration: 4.2,
    },
    {
      id: 'research_002',
      script: "Hang tight, partner. Lookin' up recent sales on this one...",
      audio_url: 'tier1/researching/research_002.mp3',
      duration: 3.8,
    },
    {
      id: 'research_003',
      script: "Let me check what the market's sayin'...",
      audio_url: 'tier1/researching/research_003.mp3',
      duration: 2.9,
    },
    {
      id: 'research_004',
      script: "Pullin' up sold listings... give me a sec...",
      audio_url: 'tier1/researching/research_004.mp3',
      duration: 3.2,
    },
  ],

  // STAGE C: DECIDING - Excited (High offer)
  deciding_excited: [
    {
      id: 'decide_excited_001',
      script: "NOW we're talkin'...",
      audio_url: 'tier1/deciding/excited_001.mp3',
      duration: 1.6,
    },
    {
      id: 'decide_excited_002',
      script: "Ohhh yeah, this is good...",
      audio_url: 'tier1/deciding/excited_002.mp3',
      duration: 1.9,
    },
  ],

  // STAGE C: DECIDING - Confident (Standard offer)
  deciding_confident: [
    {
      id: 'decide_confident_001',
      script: "Alright, got your number...",
      audio_url: 'tier1/deciding/confident_001.mp3',
      duration: 1.7,
    },
    {
      id: 'decide_confident_002',
      script: "Fair price comin' up...",
      audio_url: 'tier1/deciding/confident_002.mp3',
      duration: 1.6,
    },
  ],

  // STAGE C: DECIDING - Sympathetic (Low offer)
  deciding_sympathetic: [
    {
      id: 'decide_sympathetic_001',
      script: "Here's what I can do...",
      audio_url: 'tier1/deciding/sympathetic_001.mp3',
      duration: 1.5,
    },
    {
      id: 'decide_sympathetic_002',
      script: "Market's tough on these...",
      audio_url: 'tier1/deciding/sympathetic_002.mp3',
      duration: 1.7,
    },
  ],

  // STAGE C: DECIDING - Disappointed (Very low)
  deciding_disappointed: [
    {
      id: 'decide_disappointed_001',
      script: "Market's rough on these...",
      audio_url: 'tier1/deciding/disappointed_001.mp3',
      duration: 1.6,
    },
    {
      id: 'decide_disappointed_002',
      script: "Not much I can do here...",
      audio_url: 'tier1/deciding/disappointed_002.mp3',
      duration: 1.7,
    },
  ],
};

/**
 * Select random script from stage
 */
export function selectStageScript(
  stage: 'examining' | 'researching' | 'deciding_excited' | 'deciding_confident' | 'deciding_sympathetic' | 'deciding_disappointed'
) {
  const scripts = RESEARCH_STAGE_SCRIPTS[stage];
  return scripts[Math.floor(Math.random() * scripts.length)];
}
