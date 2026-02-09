/**
 * API Client for JakeBuysIt Backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface OfferSubmission {
  photos: File[];
  description?: string;
  userId?: string;
}

export interface OfferResponse {
  offerId: string;
  status: "processing" | "completed" | "failed";
}

export interface OfferDetails {
  id: string;
  itemName: string;
  brand?: string;
  model?: string;
  condition: string;
  category: string;
  jakePrice: number;
  marketAvg: number;
  marketRange: { min: number; max: number };
  comparablesCount: number;
  confidence: number;
  jakeVoiceUrl: string;
  jakeScript: string;
  expiresAt: string;
  animationState: string;
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

class APIClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Submit photos for an offer
   */
  async submitOffer(data: OfferSubmission): Promise<OfferResponse> {
    const formData = new FormData();
    data.photos.forEach((photo, index) => {
      formData.append(`photo_${index}`, photo);
    });
    if (data.description) {
      formData.append("description", data.description);
    }
    if (data.userId) {
      formData.append("userId", data.userId);
    }

    const response = await fetch(`${this.baseUrl}/api/v1/offers/create`, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Failed to submit offer");
    }

    return response.json();
  }

  /**
   * Get offer details
   */
  async getOffer(offerId: string): Promise<OfferDetails> {
    const response = await fetch(`${this.baseUrl}/api/v1/offers/${offerId}`);

    if (!response.ok) {
      throw new Error("Failed to fetch offer");
    }

    return response.json();
  }

  /**
   * Accept an offer
   */
  async acceptOffer(
    offerId: string,
    data: AcceptOfferRequest
  ): Promise<{ shipmentId: string; labelUrl: string }> {
    const response = await fetch(
      `${this.baseUrl}/api/v1/offers/${offerId}/accept`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
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
    const response = await fetch(
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
}

export const apiClient = new APIClient();
