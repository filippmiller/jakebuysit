/**
 * Jake Chatbot - Conversation Engine
 * Handles real-time conversational AI with Jake's western personality
 */

import Anthropic from '@anthropic-ai/sdk';
import { logger } from '../../../backend/src/utils/logger.js';
import type { OfferContext } from './context.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export type AnimationState =
  | 'idle'
  | 'thinking'
  | 'explaining'
  | 'friendly'
  | 'excited'
  | 'sympathetic'
  | 'confident'
  | 'disappointed';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResponse {
  message: string;
  animation_state: AnimationState;
}

/**
 * Jake's character system prompt
 * Based on AGENT-3-JAKE-VOICE-CHARACTER.md
 */
const JAKE_SYSTEM_PROMPT = `You are Jake, a western-style pawn shop owner with a warm baritone voice and slight Texas drawl.

CORE TRAITS:
- Age: 40-60, experienced and knowledgeable
- Personality: Direct, funny, rough around edges, but genuinely fair
- Voice style: Warm, conversational, uses western colloquialisms

VOICE CHARACTERISTICS:
- Use drawl: "gettin'", "ain't", "lemme", "y'all"
- Contractions: "gonna", "wanna", "gotta"
- Signature phrases:
  * "Take it or leave it, partner"
  * "Now THAT's what I'm talkin' about"
  * "I've seen a lotta these come through here"
  * "Been in this business a long time"
  * "No hard feelings"

NEVER USE:
- Corporate speak ("We appreciate your business")
- Overly polite ("Would you perhaps consider")
- Technical jargon ("Our algorithm determined")
- Generic AI responses ("As an AI, I cannot...")

CONTEXT AWARENESS:
You have access to specific details about the user's item. Reference these details naturally in conversation:
- The item's condition and any damage
- How you calculated the price (comparables, market value, condition factors)
- Why you're confident in the offer
- Specific features that affected the valuation

Keep responses conversational and under 50 words. Be helpful, informative, and stay in character.`;

/**
 * Conversation Manager
 * Maintains chat history and generates responses
 */
export class ConversationManager {
  private conversationHistory: Map<string, ChatMessage[]> = new Map();
  private maxHistoryLength = 20; // Keep last 20 messages

  /**
   * Generate a chat response from Jake
   */
  async generateResponse(
    offerId: string,
    userMessage: string,
    context: OfferContext
  ): Promise<ChatResponse> {
    const history = this.getHistory(offerId);

    // Add user message to history
    history.push({
      role: 'user',
      content: userMessage,
    });

    // Build context-enriched system prompt
    const systemPrompt = this.buildSystemPrompt(context);

    try {
      logger.info({ offerId, userMessage }, 'Generating Jake response');

      const response = await anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        system: systemPrompt,
        messages: history.map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Claude');
      }

      const jakeMessage = content.text;

      // Add Jake's response to history
      history.push({
        role: 'assistant',
        content: jakeMessage,
      });

      // Trim history if too long
      if (history.length > this.maxHistoryLength) {
        history.splice(0, history.length - this.maxHistoryLength);
      }

      this.setHistory(offerId, history);

      // Determine animation state based on message tone
      const animationState = this.determineAnimationState(jakeMessage, context);

      logger.info({ offerId, animationState }, 'Jake response generated');

      return {
        message: jakeMessage,
        animation_state: animationState,
      };
    } catch (error) {
      logger.error({ offerId, error }, 'Failed to generate Jake response');
      throw error;
    }
  }

  /**
   * Build system prompt with offer context
   */
  private buildSystemPrompt(context: OfferContext): string {
    const contextInfo = `
CURRENT OFFER DETAILS:
Item: ${context.item_name}
${context.brand ? `Brand: ${context.brand}` : ''}
Category: ${context.category}
Condition: ${context.condition}

YOUR OFFER: $${context.offer_amount}
Market Value (FMV): $${context.fmv}
Offer Percentage: ${((context.offer_amount / context.fmv) * 100).toFixed(0)}%

PRICING BREAKDOWN:
- Checked ${context.comparables} sold listings
- Confidence: ${context.confidence}%
${context.condition_notes ? `- Condition notes: ${context.condition_notes}` : ''}

FEATURES:
${context.features ? context.features.map(f => `- ${f}`).join('\n') : 'Standard features'}

${context.damage && context.damage.length > 0 ? `DAMAGE/WEAR:\n${context.damage.map(d => `- ${d}`).join('\n')}` : ''}

Use this information to answer questions about pricing, condition, and how you calculated the offer. Be specific and reference real data points.`;

    return `${JAKE_SYSTEM_PROMPT}\n\n${contextInfo}`;
  }

  /**
   * Determine animation state based on message content and context
   */
  private determineAnimationState(message: string, context: OfferContext): AnimationState {
    const lowerMessage = message.toLowerCase();

    // Analyzing pricing or calculations
    if (lowerMessage.includes('calculated') || lowerMessage.includes('comparables') ||
        lowerMessage.includes('checked')) {
      return 'explaining';
    }

    // Positive/excited about value
    if (lowerMessage.includes('great') || lowerMessage.includes('nice') ||
        lowerMessage.includes('talkin\'') || context.offer_amount / context.fmv > 0.7) {
      return 'excited';
    }

    // Sympathetic about lower offers
    if (lowerMessage.includes('fair') || lowerMessage.includes('honest') ||
        context.offer_amount / context.fmv < 0.4) {
      return 'sympathetic';
    }

    // Confident about offer
    if (lowerMessage.includes('confident') || lowerMessage.includes('good deal') ||
        lowerMessage.includes('take it')) {
      return 'confident';
    }

    // Friendly default
    return 'friendly';
  }

  /**
   * Get conversation history for an offer
   */
  private getHistory(offerId: string): ChatMessage[] {
    let history = this.conversationHistory.get(offerId);
    if (!history) {
      history = [];
      this.conversationHistory.set(offerId, history);
    }
    return history;
  }

  /**
   * Set conversation history
   */
  private setHistory(offerId: string, history: ChatMessage[]): void {
    this.conversationHistory.set(offerId, history);
  }

  /**
   * Clear conversation history for an offer
   */
  clearHistory(offerId: string): void {
    this.conversationHistory.delete(offerId);
  }

  /**
   * Generate initial greeting for a new chat session
   */
  async generateGreeting(offerId: string, context: OfferContext): Promise<ChatResponse> {
    const ratio = context.offer_amount / context.fmv;

    let greeting: string;
    let animationState: AnimationState;

    if (ratio >= 0.7) {
      greeting = `Hey there! Got questions about that ${context.item_name}? I'm pretty excited about this one - gave ya a solid offer. What's on your mind?`;
      animationState = 'excited';
    } else if (ratio >= 0.4) {
      greeting = `Howdy! Happy to explain anything about your ${context.item_name} offer. Fire away with your questions, partner.`;
      animationState = 'friendly';
    } else {
      greeting = `Hey there. I know the offer on that ${context.item_name} might seem low, but lemme explain my reasoning. What would ya like to know?`;
      animationState = 'sympathetic';
    }

    // Add greeting to history
    const history = this.getHistory(offerId);
    history.push({
      role: 'assistant',
      content: greeting,
    });
    this.setHistory(offerId, history);

    return {
      message: greeting,
      animation_state: animationState,
    };
  }
}

/**
 * Singleton instance
 */
export const conversationManager = new ConversationManager();
