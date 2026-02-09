/**
 * Jake Voice & Character System - Type Definitions
 */

export type JakeTone =
  | 'excited'
  | 'confident'
  | 'neutral'
  | 'sympathetic'
  | 'disappointed'
  | 'suspicious'
  | 'impressed'
  | 'firm';

export type JakeAnimationState =
  | 'idle'
  | 'examining'
  | 'researching'
  | 'excited'
  | 'offering'
  | 'celebrating'
  | 'sympathetic'
  | 'disappointed'
  | 'suspicious'
  | 'thinking';

export type VoiceTier = 1 | 2 | 3;

export type ScenarioType =
  | 'greeting_first'
  | 'greeting_returning'
  | 'greeting_vip'
  | 'category_reaction'
  | 'examining'
  | 'researching'
  | 'offer_presentation'
  | 'offer_high_value'
  | 'offer_low_value'
  | 'offer_standard'
  | 'acceptance'
  | 'decline'
  | 'rejection'
  | 'escalation'
  | 'shipping_instructions'
  | 'item_received'
  | 'payout_sent'
  | 'fraud_challenge'
  | 'condition_dispute'
  | 'store_credit_bonus';

export interface OfferData {
  offerId: string;
  item: string;
  brand: string;
  category: string;
  fmv: number;
  offer: number;
  confidence: number;
  comparables: number;
  condition: string;
  market_data?: {
    ebay_median?: number;
    amazon_price?: number;
    recent_sales?: number;
  };
}

export interface UserData {
  userId: string;
  name: string;
  trust_score: number;
  transaction_count: number;
  jake_familiarity: 'new' | 'returning' | 'regular' | 'vip';
}

export interface ScriptGenerationRequest {
  scenario: ScenarioType;
  tone?: JakeTone;
  data: OfferData | UserData | Record<string, any>;
  tier_preference?: VoiceTier;
}

export interface ScriptGenerationResult {
  script: string;
  tone: JakeTone;
  estimated_duration: number;
  tier_recommended: VoiceTier;
  variables_filled: Record<string, string>;
  character_check_passed: boolean;
}

export interface VoiceSynthesisRequest {
  script: string;
  tone: JakeTone;
  priority: 'high' | 'normal' | 'low';
}

export interface VoiceSynthesisResult {
  audio_url: string;
  duration: number;
  cached: boolean;
  waveform?: number[];
}

export interface JakeResponse {
  script: string;
  audio_url?: string;
  animation_state: JakeAnimationState;
  animation_duration: number;
  tone: JakeTone;
  duration: number;
  tier_used: VoiceTier;
}

export interface ScriptTemplate {
  id: string;
  scenario: ScenarioType;
  template: string;
  variables: string[];
  tone: JakeTone;
  tier: VoiceTier;
  success_rate?: number;
  play_rate?: number;
  completion_rate?: number;
  created_at: Date;
  updated_at: Date;
}

export interface VoiceEngagementEvent {
  id: string;
  user_id: string;
  scenario: ScenarioType;
  script: string;
  audio_url: string;
  played: boolean;
  completed: boolean;
  skipped_at?: number;
  offer_accepted?: boolean;
  created_at: Date;
}

export interface CharacterConsistencyCheck {
  passed: boolean;
  violations: string[];
  score: number;
}
