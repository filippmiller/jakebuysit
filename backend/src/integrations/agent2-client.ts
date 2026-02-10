/**
 * Agent 2 Integration Client — AI Vision & Pricing Engine
 * Calls the Python FastAPI service for item identification, marketplace research, and pricing.
 */
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const BASE_URL = config.agents.agent2Url;
const TIMEOUT_MS = 30_000;

export interface VisionResult {
  category: string;
  subcategory: string;
  brand: string;
  model: string;
  condition: string;
  features: string[];
  damage: string[];
  confidence: number;
  identifiers: { upc?: string; model_number?: string };
  conditionGrade?: string;
  conditionNotes?: string;
  seoTitle?: string;
  // Phase 4 Team 1: Enhanced metadata
  productMetadata?: {
    brand?: string;
    model?: string;
    variant?: string;
    storage?: string;
    color?: string;
    year?: number;
    generation?: string;
    condition_specifics?: Record<string, any>;
  };
  serialInfo?: {
    serial_number?: string;
    confidence?: number;
    method?: string;
    location?: string;
    imei?: string;
  };
}

export interface MarketplaceResult {
  listings: Array<{ source: string; price: number; title: string; sold_date?: string }>;
  stats: {
    count: number;
    median: number;
    mean: number;
    std_dev: number;
    percentiles: { p25: number; p50: number; p75: number };
    min_price?: number;
    max_price?: number;
  };
  sources_checked: string[];
  cache_hit: boolean;
}

export interface ComparableSale {
  source: string;
  title: string;
  price: number;
  sold_date?: string;
  condition: string;
  url?: string;
}

export interface PricingResult {
  fmv: number;
  fmv_confidence: number;
  offer_amount: number;
  offer_to_market_ratio: number;
  condition_multiplier: number;
  category_margin: number;
  data_quality: string;
  range: { low: number; high: number };
  pricing_confidence?: number;
  comparable_sales?: ComparableSale[];
  confidence_factors?: {
    score: number;
    data_points: number;
    data_availability: string;
    recency_score: number;
    recency_quality: string;
    price_variance: string;
    coefficient_of_variation?: number;
    category_coverage: string;
    explanation: string;
  };
}

async function agent2Fetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    logger.info({ url, body }, 'Calling Agent 2');

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Agent 2 responded ${res.status}: ${text}`);
    }

    const data = (await res.json()) as T;
    logger.info({ url, status: res.status }, 'Agent 2 response OK');
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Agent 2 timeout after ${TIMEOUT_MS}ms on ${path}`);
    }
    logger.error({ url, error: err.message }, 'Agent 2 call failed');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const agent2 = {
  /** Identify an item from photos using Claude Vision */
  async identify(photoUrls: string[], userDescription?: string): Promise<VisionResult> {
    return agent2Fetch<VisionResult>('/api/v1/identify', {
      photo_urls: photoUrls,
      user_description: userDescription,
    });
  },

  /** Research marketplace prices for an identified item */
  async research(brand: string, model: string, category: string, condition?: string): Promise<MarketplaceResult> {
    return agent2Fetch<MarketplaceResult>('/api/v1/research', {
      brand, model, category, condition,
    });
  },

  /** Calculate FMV and generate offer amount */
  async price(
    marketplaceStats: MarketplaceResult['stats'],
    category: string,
    condition: string,
  ): Promise<PricingResult> {
    return agent2Fetch<PricingResult>('/api/v1/price', {
      marketplace_stats: marketplaceStats,
      category,
      condition,
    });
  },

  /** Optimize prices for stale listings (batch analysis) */
  async optimizePrices(
    offers: Array<{
      offer_id: string;
      current_price: number;
      original_offer: number;
      created_at: string;
      view_count: number;
      last_optimized: string | null;
    }>
  ): Promise<Record<string, any>> {
    return agent2Fetch<Record<string, any>>('/api/v1/optimize-prices', {
      offers,
    });
  },
};
