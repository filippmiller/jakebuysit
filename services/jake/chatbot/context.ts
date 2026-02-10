/**
 * Jake Chatbot - Context Manager
 * Retrieves and structures offer data for conversational context
 */

import { logger } from '../../../backend/src/utils/logger.js';

export interface OfferContext {
  offer_id: string;
  item_name: string;
  brand?: string;
  category: string;
  condition: string;
  condition_notes?: string;
  offer_amount: number;
  fmv: number;
  confidence: number;
  comparables: number;
  features?: string[];
  damage?: string[];
  user_name?: string;
}

/**
 * Context Provider
 * Fetches offer details from backend to provide conversation context
 */
export class ContextProvider {
  private backendUrl: string;

  constructor(backendUrl?: string) {
    this.backendUrl = backendUrl || process.env.AGENT4_URL || 'http://localhost:3001';
  }

  /**
   * Fetch offer context from backend
   */
  async getOfferContext(offerId: string): Promise<OfferContext> {
    try {
      logger.info({ offerId }, 'Fetching offer context from backend');

      const response = await fetch(`${this.backendUrl}/api/v1/offers/${offerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Backend returned ${response.status}: ${await response.text()}`);
      }

      const offer = await response.json();

      // Transform backend offer data into conversation context
      const context: OfferContext = {
        offer_id: offer.id,
        item_name: this.buildItemName(offer),
        brand: offer.item_brand,
        category: offer.item_category,
        condition: offer.item_condition || 'Unknown',
        condition_notes: offer.condition_notes,
        offer_amount: offer.offer_amount,
        fmv: offer.fmv,
        confidence: offer.confidence_score || 85,
        comparables: offer.comparables_count || 0,
        features: this.extractFeatures(offer.item_features),
        damage: this.extractDamage(offer.item_damage),
        user_name: offer.user?.name,
      };

      logger.info({ offerId, context }, 'Offer context retrieved');

      return context;
    } catch (error) {
      logger.error({ offerId, error }, 'Failed to fetch offer context');
      throw new Error(`Could not retrieve offer context: ${(error as Error).message}`);
    }
  }

  /**
   * Build human-readable item name
   */
  private buildItemName(offer: any): string {
    const parts: string[] = [];

    if (offer.item_brand) parts.push(offer.item_brand);
    if (offer.item_model) parts.push(offer.item_model);
    if (parts.length === 0 && offer.item_category) parts.push(offer.item_category);
    if (parts.length === 0) parts.push('item');

    return parts.join(' ');
  }

  /**
   * Extract features from JSONB field
   */
  private extractFeatures(features: any): string[] | undefined {
    if (!features) return undefined;

    if (Array.isArray(features)) {
      return features;
    }

    if (typeof features === 'object') {
      // Convert object keys/values to feature list
      return Object.entries(features)
        .filter(([_, value]) => value === true || (typeof value === 'string' && value.length > 0))
        .map(([key, value]) => typeof value === 'string' ? `${key}: ${value}` : key);
    }

    return undefined;
  }

  /**
   * Extract damage/wear from JSONB field
   */
  private extractDamage(damage: any): string[] | undefined {
    if (!damage) return undefined;

    if (Array.isArray(damage)) {
      return damage.filter(d => typeof d === 'string' && d.length > 0);
    }

    if (typeof damage === 'object') {
      // Convert object to damage list
      return Object.entries(damage)
        .filter(([_, value]) => value === true || (typeof value === 'string' && value.length > 0))
        .map(([key, value]) => typeof value === 'string' ? `${key}: ${value}` : key);
    }

    return undefined;
  }

  /**
   * Validate offer exists and is in correct state for chat
   */
  async validateOfferForChat(offerId: string): Promise<boolean> {
    try {
      const context = await this.getOfferContext(offerId);

      // Chat is only available for offers that have been priced
      return context.offer_amount > 0 && context.fmv > 0;
    } catch (error) {
      logger.warn({ offerId, error }, 'Offer validation failed');
      return false;
    }
  }
}

/**
 * Singleton instance
 */
export const contextProvider = new ContextProvider();
