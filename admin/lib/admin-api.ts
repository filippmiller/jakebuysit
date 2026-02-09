import axios, { type AxiosInstance } from 'axios';
import type { DashboardMetrics, OfferFeedItem } from '@/types/dashboard';
import type { OfferData, OfferFilters } from '@/types/offer';
import type { EscalatedOffer, EscalationDecision } from '@/types/escalation';
import type { UserData } from '@/types/user';
import type { ConfigType, ConfigUpdate } from '@/types/config';

const API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8080';

class AdminAPI {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/api/v1/admin`,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor for JWT auth
    this.client.interceptors.request.use(
      (config) => {
        // Get JWT from localStorage or cookie
        const token = typeof window !== 'undefined' ? localStorage.getItem('admin_token') : null;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Redirect to login
          if (typeof window !== 'undefined') {
            window.location.href = '/login';
          }
        }
        return Promise.reject(error);
      }
    );
  }

  // Dashboard
  async getDashboardMetrics(): Promise<DashboardMetrics> {
    const { data } = await this.client.get<DashboardMetrics>('/dashboard/metrics');
    return data;
  }

  async getDashboardFeed(limit = 50): Promise<OfferFeedItem[]> {
    const { data } = await this.client.get<OfferFeedItem[]>('/dashboard/feed', {
      params: { limit },
    });
    return data;
  }

  // Offers
  async getOffers(filters: Partial<OfferFilters>, page = 1): Promise<{ offers: OfferData[]; total: number }> {
    const { data } = await this.client.get('/offers', {
      params: { ...filters, page },
    });
    return data;
  }

  async getOfferById(id: string): Promise<OfferData> {
    const { data } = await this.client.get<OfferData>(`/offers/${id}`);
    return data;
  }

  async updateOfferPrice(id: string, price: number, reason: string): Promise<void> {
    await this.client.put(`/offers/${id}/price`, { price, reason });
  }

  async escalateOffer(id: string, reason: string): Promise<void> {
    await this.client.post(`/offers/${id}/escalate`, { reason });
  }

  async rejectOffer(id: string, reason: string): Promise<void> {
    await this.client.post(`/offers/${id}/reject`, { reason });
  }

  async flagFraud(id: string, reason: string): Promise<void> {
    await this.client.post(`/offers/${id}/fraud`, { reason });
  }

  // Escalations
  async getEscalations(): Promise<EscalatedOffer[]> {
    const { data } = await this.client.get<EscalatedOffer[]>('/escalations');
    return data;
  }

  async claimEscalation(id: string): Promise<void> {
    await this.client.post(`/escalations/${id}/claim`);
  }

  async resolveEscalation(id: string, decision: EscalationDecision): Promise<void> {
    await this.client.post(`/escalations/${id}/resolve`, decision);
  }

  // Configuration
  async getConfig(type: ConfigType): Promise<any> {
    const { data } = await this.client.get(`/config/${type}`);
    return data;
  }

  async updateConfig(update: ConfigUpdate): Promise<void> {
    await this.client.put('/config', update);
  }

  async getConfigAuditLog(type?: ConfigType): Promise<any[]> {
    const { data } = await this.client.get('/config/audit', {
      params: { type },
    });
    return data;
  }

  // Users
  async getUsers(filters: any, page = 1): Promise<{ users: UserData[]; total: number }> {
    const { data } = await this.client.get('/users', {
      params: { ...filters, page },
    });
    return data;
  }

  async getUserById(id: string): Promise<UserData> {
    const { data } = await this.client.get<UserData>(`/users/${id}`);
    return data;
  }

  async banUser(id: string, reason: string): Promise<void> {
    await this.client.post(`/users/${id}/ban`, { reason });
  }

  async updateTrustScore(id: string, score: number, reason: string): Promise<void> {
    await this.client.put(`/users/${id}/trust-score`, { score, reason });
  }

  // Add more methods as needed...
}

// Export singleton instance
export const adminAPI = new AdminAPI();

// Export convenience functions
export const fetchDashboardMetrics = () => adminAPI.getDashboardMetrics();
export const fetchDashboardFeed = (limit?: number) => adminAPI.getDashboardFeed(limit);
export const fetchOfferById = (id: string) => adminAPI.getOfferById(id);
export const fetchUserById = (id: string) => adminAPI.getUserById(id);
