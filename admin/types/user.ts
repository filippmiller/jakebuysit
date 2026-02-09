export interface UserData {
  id: string;
  email: string;
  name: string;
  phone?: string;

  // Auth
  authProvider: 'email' | 'google' | 'apple';
  emailVerified: boolean;
  phoneVerified: boolean;

  // Trust & Fraud
  trustScore: number;
  riskFlags: string[];
  fraudHistory: Array<{
    type: string;
    flaggedAt: string;
    resolved: boolean;
  }>;

  // Jake Familiarity
  jakeFamiliarity: 'new' | 'familiar' | 'friend';
  jakeBucks: number;

  // Stats
  stats: {
    offersCount: number;
    offersAccepted: number;
    offersRejected: number;
    acceptanceRate: number;
    avgOfferAmount: number;
    totalEarned: number;
    categoriesSold: string[];
  };

  // Timestamps
  createdAt: string;
  lastActiveAt: string;

  // Admin
  banned: boolean;
  banReason?: string;
  bannedAt?: string;
}

export interface UserFilters {
  trustScore: string;
  familiarity: string;
  dateRange: { from: Date; to: Date } | null;
  search: string;
}
