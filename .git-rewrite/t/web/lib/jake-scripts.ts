/**
 * Client-side Jake personality copy and scripts
 */

export const jakeVoice = {
  // Landing page
  hero: {
    headline: "Howdy, Partner! Jake Buys It.",
    subheadline: "Show me what you got, and I'll give you a fair price. Quick as a rattlesnake's strike.",
    cta: "Show Jake What You Got",
  },

  // How it works
  howItWorks: [
    {
      title: "1. Show Jake",
      description: "Snap a few photos of your item. Don't be shy now.",
    },
    {
      title: "2. Jake Looks",
      description: "I'll check what you got and see what folks are payin' for it.",
    },
    {
      title: "3. Get Paid",
      description: "Accept my offer and I'll send you cash faster than a tumbleweed in a tornado.",
    },
  ],

  // Camera guidance
  camera: {
    guidance: "Get the whole thing in frame, partner",
    multiplePhotos: "Take a few angles if ya want. More the merrier!",
    uploadSuccess: "Alright, lemme take a look...",
    error: "Whoops! That didn't work. Give it another shot, partner.",
  },

  // Research states
  research: {
    looking: "Alright, let's see what we got here...",
    researching: "Checkin' what these are goin' for...",
    deciding: "Now, here's what I can do for ya...",
  },

  // Offer states
  offer: {
    high: "Now THAT's what I'm talkin' about!",
    medium: "Fair and square, partner.",
    low: "Best I can do on this one, friend.",
    declined: "No hard feelings, partner. Come back anytime!",
  },

  // Registration
  registration: {
    prompt: "Now I just need to know where to send your money!",
    jakeBucksBonus: "Use Jake Bucks and get an extra {bonus}% - that's free money, partner!",
  },

  // Shipping
  shipping: {
    instructions: "Box it up, slap this label on, and ship it out. Easy as pie.",
    schedulePickup: "Want me to have someone come grab it? Just say the word.",
  },

  // Dashboard
  dashboard: {
    greeting: {
      new: "Welcome to Jake's office, partner!",
      returning: "Good to see ya again!",
      vip: "Well if it ain't my favorite customer! Howdy!",
    },
  },

  // Errors
  errors: {
    generic: "Well shucks, somethin' went wrong. Give it another try?",
    network: "Can't seem to connect. Check your internet, partner.",
    timeout: "This is takin' longer than expected. Hang tight...",
    invalidFile: "That file don't look right. Try a photo instead.",
  },

  // Loading states
  loading: {
    default: "Jake's thinkin'...",
    processing: "Workin' on it...",
    researching: "Checkin' the markets...",
  },
};

/**
 * Generate Jake-style copy dynamically
 */
export function getJakeCopy(
  type: keyof typeof jakeVoice,
  key?: string
): string {
  if (!key) {
    return JSON.stringify(jakeVoice[type]);
  }

  const section = jakeVoice[type] as any;
  return section[key] || "";
}

/**
 * Jake's character states for animation
 */
export enum JakeState {
  IDLE = "idle",
  EXAMINING = "examining",
  RESEARCHING = "researching",
  EXCITED = "excited",
  OFFERING = "offering",
  CELEBRATING = "celebrating",
  SYMPATHETIC = "sympathetic",
  DISAPPOINTED = "disappointed",
  SUSPICIOUS = "suspicious",
  THINKING = "thinking",
}

/**
 * Map offer scenarios to Jake states
 */
export function getJakeStateForOffer(
  jakePrice: number,
  marketAvg: number,
  confidence: number
): JakeState {
  const ratio = jakePrice / marketAvg;

  if (confidence < 0.5) {
    return JakeState.SUSPICIOUS;
  }

  if (ratio > 0.8) {
    return JakeState.EXCITED;
  }

  if (ratio > 0.6) {
    return JakeState.OFFERING;
  }

  return JakeState.SYMPATHETIC;
}
