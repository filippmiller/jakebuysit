/**
 * Recommendation Service Integration Client
 * Calls the Python FastAPI recommendation engine
 */
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const BASE_URL = config.agents.recommendationsUrl || 'http://localhost:8005';
const TIMEOUT_MS = 10_000;

export interface RecommendationItem {
  offer_id: string;
  score: number;
  reason: string;
  item_category?: string;
  item_brand?: string;
  item_model?: string;
  item_condition?: string;
  offer_amount?: number;
  thumbnail_url?: string;
}

export interface RecommendationResponse {
  recommendations: RecommendationItem[];
  algorithm: string;
  cached: boolean;
}

async function recommendationsFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    logger.info({ url, body }, 'Calling Recommendation Service');

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Recommendation Service responded ${res.status}: ${text}`);
    }

    const data = (await res.json()) as T;
    logger.info({ url, status: res.status }, 'Recommendation Service response OK');
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Recommendation Service timeout after ${TIMEOUT_MS}ms on ${path}`);
    }
    logger.error({ url, error: err.message }, 'Recommendation Service call failed');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const recommendations = {
  /** Get personalized recommendations for a user */
  async forUser(
    userId: string,
    limit: number = 10,
    excludeOfferIds: string[] = []
  ): Promise<RecommendationResponse> {
    return recommendationsFetch<RecommendationResponse>('/api/v1/recommendations/for-user', {
      user_id: userId,
      limit,
      exclude_offer_ids: excludeOfferIds,
    });
  },

  /** Get items similar to a given offer */
  async similar(
    offerId: string,
    limit: number = 10,
    userId?: string
  ): Promise<RecommendationResponse> {
    return recommendationsFetch<RecommendationResponse>('/api/v1/recommendations/similar', {
      offer_id: offerId,
      limit,
      user_id: userId,
    });
  },

  /** Get trending items */
  async trending(
    days: number = 7,
    limit: number = 10,
    category?: string
  ): Promise<RecommendationResponse> {
    return recommendationsFetch<RecommendationResponse>('/api/v1/recommendations/trending', {
      days,
      limit,
      category,
    });
  },
};
