/**
 * Admin API client for JakeBuysIt admin panel.
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";
const ADMIN_PREFIX = `${API_BASE_URL}/api/v1/admin`;

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("adminAccessToken");
}

function headers(json = true): Record<string, string> {
  const h: Record<string, string> = {};
  const token = getToken();
  if (token) h["Authorization"] = `Bearer ${token}`;
  if (json) h["Content-Type"] = "application/json";
  return h;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${ADMIN_PREFIX}${path}`, {
    ...options,
    headers: { ...headers(), ...(options?.headers || {}) },
  });

  if (res.status === 401) {
    localStorage.removeItem("adminAccessToken");
    if (typeof window !== "undefined") window.location.href = "/admin/login";
    throw new Error("Session expired");
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `Request failed: ${res.status}`);
  }

  return res.json();
}

function qs(params: Record<string, any>): string {
  const entries = Object.entries(params).filter(([, v]) => v !== undefined && v !== "" && v !== null);
  if (entries.length === 0) return "";
  return "?" + entries.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
}

export const adminApi = {
  // Dashboard
  getDashboardMetrics: () => request<any>("/dashboard/metrics"),
  getDashboardActivity: () => request<any>("/dashboard/activity"),
  getDashboardAlerts: () => request<any>("/dashboard/alerts"),

  // Offers
  getOffers: (params?: Record<string, any>) => request<any>(`/offers${qs(params || {})}`),
  getOffer: (id: string) => request<any>(`/offers/${id}`),
  updateOffer: (id: string, data: any) => request<any>(`/offers/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  getOfferAiLog: (id: string) => request<any>(`/offers/${id}/ai-log`),

  // Payouts
  getPayouts: (params?: Record<string, any>) => request<any>(`/payouts${qs(params || {})}`),
  processPayout: (id: string, data: any) => request<any>(`/payouts/${id}/process`, { method: "POST", body: JSON.stringify(data) }),
  completePayout: (id: string) => request<any>(`/payouts/${id}/complete`, { method: "POST" }),

  // Shipments
  getShipments: (params?: Record<string, any>) => request<any>(`/shipments${qs(params || {})}`),
  generateLabel: (data: any) => request<any>("/shipments/generate-label", { method: "POST", body: JSON.stringify(data) }),
  updateShipment: (id: string, data: any) => request<any>(`/shipments/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Users
  getUsers: (params?: Record<string, any>) => request<any>(`/users${qs(params || {})}`),
  getUser: (id: string) => request<any>(`/users/${id}`),
  updateUser: (id: string, data: any) => request<any>(`/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),

  // Escalations
  getEscalations: (params?: Record<string, any>) => request<any>(`/escalations${qs(params || {})}`),
  claimEscalation: (id: string) => request<any>(`/escalations/${id}/claim`, { method: "POST" }),
  resolveEscalation: (id: string, data: any) => request<any>(`/escalations/${id}/resolve`, { method: "POST", body: JSON.stringify(data) }),

  // Fraud
  getFraudChecks: (params?: Record<string, any>) => request<any>(`/fraud${qs(params || {})}`),
  getFraudStats: () => request<any>("/fraud/stats"),

  // Config
  getConfig: () => request<any>("/config"),
  updateConfig: (key: string, value: any) => request<any>("/config", { method: "PUT", body: JSON.stringify({ key, value }) }),

  // Audit
  getAuditLog: (params?: Record<string, any>) => request<any>(`/audit${qs(params || {})}`),

  // Analytics
  getAiAccuracy: () => request<any>("/analytics/ai-accuracy"),
  getRevenue: () => request<any>("/analytics/revenue"),
  getTrends: (params?: { days?: number; category?: string }) => request<any>(`/analytics/trends${qs(params || {})}`),
  getCategoryInsights: () => request<any>("/analytics/category-insights"),
  getBestTimeToSell: () => request<any>("/analytics/best-time-to-sell"),
  getPriceDistribution: (category: string) => request<any>(`/analytics/price-distribution/${encodeURIComponent(category)}`),
  exportAnalytics: (type: string, params?: Record<string, any>) => {
    const url = `${ADMIN_PREFIX}/analytics/export${qs({ type, ...params })}`;
    window.open(url, '_blank');
  },

  // Verifications
  getVerifications: (params?: Record<string, any>) => request<any>(`/verifications${qs(params || {})}`),
  submitVerification: (data: any) => request<any>("/verifications", { method: "POST", body: JSON.stringify(data) }),
};
