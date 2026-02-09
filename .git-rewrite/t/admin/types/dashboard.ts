export interface DashboardMetrics {
  todayOffers: {
    count: number;
    trend: number; // percentage change vs yesterday
  };
  acceptanceRate: {
    today: number;
    week: number;
    month: number;
  };
  itemsInTransit: number;
  payoutsPending: {
    amount: number;
    count: number;
  };
  escalationsCount: number;
  fraudAlertsCount: number;
  payoutIssuesCount: number;
}

export interface OfferFeedItem {
  id: string;
  userId: string;
  userEmail: string;
  category: string;
  brand: string;
  model: string;
  offerAmount: number;
  status: 'processing' | 'ready' | 'accepted' | 'escalated' | 'rejected' | 'fraud';
  confidence: number;
  createdAt: string;
  thumbnail?: string;
}
