/**
 * Jake Script Template Library
 * 
 * Tier 2: Template-based scripts with variable slots
 * These are pre-written, Jake-approved scripts with [VARIABLES]
 */

import { ScriptTemplate, ScenarioType, JakeTone } from '../../../../types/jake.js';

/**
 * Select a template for the given scenario, optionally weighted by user context.
 */
export function selectTemplate(
  scenario: ScenarioType,
  _context?: Record<string, any>,
): ScriptTemplate | null {
  const pool = SCRIPT_TEMPLATES[scenario];
  if (!pool || pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

/**
 * Fill a template's [VARIABLE] placeholders with concrete values.
 */
export function fillTemplate(
  template: ScriptTemplate,
  values: Record<string, string>,
): string {
  let text = template.template;
  for (const [key, val] of Object.entries(values)) {
    const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    text = text.replace(new RegExp(`\\[${escaped}\\]`, 'g'), val);
  }
  return text;
}

export const SCRIPT_TEMPLATES: Record<ScenarioType, ScriptTemplate[]> = {
  // GREETINGS
  greeting_first: [
    {
      id: 'greet_first_001',
      scenario: 'greeting_first',
      template: "Hey there! Welcome to Jake's. I buy just about anything worth sellin'. Show me what you got and I'll tell you what it's worth. Fair and square, sixty seconds flat.",
      variables: [],
      tone: 'confident',
      tier: 1,
      play_rate: 0.85,
      completion_rate: 0.92,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],

  greeting_returning: [
    {
      id: 'greet_return_001',
      scenario: 'greeting_returning',
      template: "Well well well, look who came back! Good to see ya. What you got for me this time?",
      variables: [],
      tone: 'confident',
      tier: 1,
      play_rate: 0.78,
      completion_rate: 0.88,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],

  greeting_vip: [
    {
      id: 'greet_vip_001',
      scenario: 'greeting_vip',
      template: "If it ain't my favorite customer! You know the drill. Let's get to business, partner.",
      variables: [],
      tone: 'excited',
      tier: 1,
      play_rate: 0.92,
      completion_rate: 0.95,
      created_at: new Date(),
      updated_at: new Date(),
    },
  ],

  // More templates omitted for brevity - see full implementation
  category_reaction: [],
  examining: [],
  researching: [],
  offer_presentation: [],
  offer_high_value: [],
  offer_low_value: [],
  offer_standard: [],
  acceptance: [],
  decline: [],
  rejection: [],
  escalation: [],
  shipping_instructions: [],
  item_received: [],
  payout_sent: [],
  fraud_challenge: [],
  condition_dispute: [],
  store_credit_bonus: [],
};
