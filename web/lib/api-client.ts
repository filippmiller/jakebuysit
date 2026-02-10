/**
 * API Client for JakeBuysIt Backend
 */

import { adaptOfferData } from "./offer-data-adapter";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

export interface OfferSubmission {
  photos: File[];
  description?: string;
  userId?: string;
}

export interface OfferResponse {
  offerId: string;
  status: "processing" | "completed" | "failed";
}

export interface ComparableSale {
  source: string;
  title: string;
  price: number;
  soldDate?: string;
  condition: string;
  url?: string;
}

export interface ConfidenceFactors {
  dataPoints: number;
  recencyScore: number;
  priceVariance: string;
  categoryCoverage: string;
  explanation: string;
}

export interface ProductMetadata {
  brand?: string;
  model?: string;
  variant?: string;
  storage?: string;
  color?: string;
  year?: number;
  generation?: string;
  condition_specifics?: Record<string, any>;
}

export interface PricingStep {
  label: string;
  value: number;
  explanation: string;
}

export interface PricingExplanation {
  steps: PricingStep[];
  jakesNote: string;
}

export interface ComparablesData {
  comparables: Array<{
    title: string;
    price: number;
    imageUrl: string;
    soldDate: string;
    source: "ebay" | "mercari" | "offerup" | "facebook" | "other";
    url: string;
  }>;
  averagePrice: number;
}

export interface OfferDetails {
  id: string;
  itemName: string;
  brand?: string;
  model?: string;
  condition: string;
  conditionGrade?: string;
  conditionNotes?: string;
  category: string;
  jakePrice: number;
  marketAvg: number;
  marketRange: { min: number; max: number };
  comparablesCount: number;
  comparableSales?: ComparableSale[];
  confidence: number;
  confidenceFactors?: ConfidenceFactors;
  pricingConfidence?: number;
  jakeVoiceUrl: string;
  jakeScript: string;
  expiresAt: string;
  animationState: string;
  seoTitle?: string;
  // Phase 4 Team 1: Enhanced metadata
  serialNumber?: string;
  productMetadata?: ProductMetadata;
  // Phase 2 Trust Features
  pricingExplanation?: PricingExplanation;
  isExpired?: boolean;
}

export interface AcceptOfferRequest {
  email: string;
  name: string;
  phone?: string;
  payoutMethod: "paypal" | "venmo" | "zelle" | "bank" | "jakebucks";
  payoutDetails: Record<string, string>;
}

export interface DashboardData {
  user: {
    name: string;
    email: string;
    jakeBucks: number;
    vipStatus?: string;
  };
  activeOffers: OfferDetails[];
  shipments: Array<{
    id: string;
    offerId: string;
    status: string;
    trackingNumber: string;
    labelUrl: string;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    createdAt: string;
  }>;
}

export interface ProfitSummary {
  totalProfit: number;
  totalSales: number;
  avgProfitPerSale: number;
  avgProfitMargin: number;
  currentMonthProfit: number;
  currentMonthSales: number;
}

export interface ProfitTrend {
  period: string;
  profit: number;
  sales: number;
  avgProfit: number;
}

export interface CategoryProfit {
  category: string;
  profit: number;
  sales: number;
  avgProfit: number;
  profitMargin: number;
}

export interface ProfitProjection {
  pendingOffers: number;
  estimatedRevenue: number;
  estimatedCosts: number;
  estimatedProfit: number;
  ifAllAcceptedProfit: number;
}

class APIClient {
  private baseUrl: string;
  private defaultTimeout = 30000; // 30 seconds

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Fetch with automatic timeout via AbortController.
   */
  private async fetchWithTimeout(
    url: string,
    options: RequestInit = {},
    timeoutMs?: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs || this.defaultTimeout);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } catch (err: any) {
      if (err.name === "AbortError") {
        throw new Error("Request timed out. Please try again.");
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }

  /**
   * Upload photos to S3, then create an offer with the returned URLs.
   */
  async submitOffer(data: OfferSubmission): Promise<OfferResponse> {
    // Step 1: Upload photos (60s timeout for large files)
    const formData = new FormData();
    data.photos.forEach((photo, index) => {
      formData.append(`photo_${index}`, photo);
    });

    const uploadResponse = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/uploads/photos`,
      { method: "POST", body: formData, headers: this.getAuthHeaders() },
      60000
    );

    if (!uploadResponse.ok) {
      const err = await uploadResponse.json().catch(() => ({ error: "Upload failed" }));
      throw new Error(err.error || "Failed to upload photos");
    }

    const { photoUrls } = await uploadResponse.json();

    // Step 2: Create offer with uploaded photo URLs
    const offerResponse = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/offers`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.getAuthHeaders() },
        body: JSON.stringify({ photoUrls, userDescription: data.description }),
      }
    );

    if (!offerResponse.ok) {
      const err = await offerResponse.json().catch(() => ({ error: "Offer creation failed" }));
      throw new Error(err.error || "Failed to create offer");
    }

    return offerResponse.json();
  }

  /**
   * Get auth headers if a token is stored.
   */
  private getAuthHeaders(): Record<string, string> {
    if (typeof window === "undefined") return {};
    const token = localStorage.getItem("accessToken");
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  /**
   * Get offer details
   */
  async getOffer(offerId: string): Promise<OfferDetails> {
    const response = await this.fetchWithTimeout(`${this.baseUrl}/api/v1/offers/${offerId}`);

    if (!response.ok) {
      throw new Error("Failed to fetch offer");
    }

    const backendData = await response.json();
    return adaptOfferData(backendData);
  }

  /**
   * Accept an offer
   */
  async acceptOffer(
    offerId: string,
    data: AcceptOfferRequest
  ): Promise<{ shipmentId: string; labelUrl: string }> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/offers/${offerId}/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...this.getAuthHeaders(),
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to accept offer");
    }

    return response.json();
  }

  /**
   * Get user dashboard data
   */
  async getDashboard(userId: string): Promise<DashboardData> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/users/${userId}/dashboard`
    );

    if (!response.ok) {
      throw new Error("Failed to fetch dashboard");
    }

    return response.json();
  }

  /**
   * Get WebSocket URL for offer updates
   */
  getOfferStreamUrl(offerId: string): string {
    const wsBase = this.baseUrl.replace("http", "ws");
    return `${wsBase}/api/v1/offers/${offerId}/stream`;
  }

  /**
   * Get personalized market insights for sellers
   */
  async getSellerInsights(category: string = 'Electronics'): Promise<any> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/offers/insights?category=${encodeURIComponent(category)}`
    );

    if (!response.ok) {
      // Return safe defaults on error
      return {
        category,
        bestDay: 'Tuesday',
        acceptanceRate: 65,
        avgOffer: 150,
        categoryTrend: 'stable',
        trendPercentage: 0,
        optimalTime: '2-4 PM',
      };
    }

    return response.json();
  }

  /**
   * Get profit summary for authenticated user
   */
  async getProfitSummary(): Promise<ProfitSummary> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/profits/summary`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch profit summary");
    }

    return response.json();
  }

  /**
   * Get profit trends (weekly or monthly) for authenticated user
   */
  async getProfitTrends(
    interval: 'week' | 'month' = 'week',
    limit: number = 12
  ): Promise<ProfitTrend[]> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/profits/trends?interval=${interval}&limit=${limit}`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch profit trends");
    }

    return response.json();
  }

  /**
   * Get profit breakdown by category for authenticated user
   */
  async getProfitByCategory(): Promise<CategoryProfit[]> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/profits/by-category`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch category profits");
    }

    return response.json();
  }

  /**
   * Get profit projections from pending offers for authenticated user
   */
  async getProfitProjections(): Promise<ProfitProjection> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/profits/projections`,
      {
        headers: this.getAuthHeaders(),
      }
    );

    if (!response.ok) {
      throw new Error("Failed to fetch profit projections");
    }

    return response.json();
  }

  /**
   * Get market comparables for an offer (Phase 2 Trust Feature)
   */
  async getOfferComparables(offerId: string): Promise<ComparablesData | null> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/offers/${offerId}/comparables`
    );

    if (!response.ok) {
      console.warn("Failed to fetch comparables, returning null");
      return null;
    }

    return response.json();
  }

  /**
   * Get pricing breakdown explanation for an offer (Phase 2 Trust Feature)
   */
  async getPricingExplanation(offerId: string): Promise<PricingExplanation | null> {
    const response = await this.fetchWithTimeout(
      `${this.baseUrl}/api/v1/offers/${offerId}/pricing-explanation`
    );

    if (!response.ok) {
      console.warn("Failed to fetch pricing explanation, returning null");
      return null;
    }

    return response.json();
  }
}

export const apiClient = new APIClient();
