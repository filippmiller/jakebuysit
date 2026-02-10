/**
 * Fraud Detection Service Integration Client
 * Calls the Python FastAPI fraud detection service at port 8004
 */
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

const BASE_URL = process.env.FRAUD_SERVICE_URL || 'http://localhost:8004';
const TIMEOUT_MS = 10_000;

export interface FraudAnalysisRequest {
  offer_id: string;
  user_id?: string | null;

  // Offer details
  offer_amount: number;
  fmv: number;
  category: string;
  condition: string;

  // User behavior
  user_created_at?: string | null;
  user_offer_count?: number;
  user_trust_score?: number;

  // Context
  ip_address?: string | null;
  user_agent?: string | null;

  // Additional signals
  photo_urls?: string[];
  description?: string | null;
}

export interface FraudFlag {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score_impact: number;
  description: string;
  evidence?: Record<string, unknown>;
}

export interface FraudAnalysisResponse {
  offer_id: string;
  risk_score: number; // 0-100
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-1

  flags: FraudFlag[];
  explanation: string;

  breakdown: {
    price_anomaly: number;
    velocity: number;
    pattern_match: number;
    user_trust: number;
  };

  recommended_action: 'approve' | 'review' | 'escalate' | 'reject';
  analyzed_at: string;
}

async function fraudFetch<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const url = `${BASE_URL}${path}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  try {
    logger.info({ url }, 'Calling Fraud Detection Service');

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Fraud service responded ${res.status}: ${text}`);
    }

    const data = (await res.json()) as T;
    logger.info({ url, status: res.status }, 'Fraud service response OK');
    return data;
  } catch (err: any) {
    if (err.name === 'AbortError') {
      throw new Error(`Fraud service timeout after ${TIMEOUT_MS}ms on ${path}`);
    }
    logger.error({ url, error: err.message }, 'Fraud service call failed');
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const fraudClient = {
  /**
   * Analyze an offer for fraud risk.
   *
   * @param request - Fraud analysis request with offer and user data
   * @returns Fraud analysis with risk score, flags, and recommended action
   */
  async analyzeFraud(request: FraudAnalysisRequest): Promise<FraudAnalysisResponse> {
    return fraudFetch<FraudAnalysisResponse>('/api/v1/analyze-fraud', request);
  },

  /**
   * Health check for fraud detection service.
   */
  async healthCheck(): Promise<{ service: string; status: string; version: string }> {
    const url = `${BASE_URL}/api/v1/health`;
    const res = await fetch(url, { signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      throw new Error(`Fraud service health check failed: ${res.status}`);
    }
    return res.json();
  },
};
