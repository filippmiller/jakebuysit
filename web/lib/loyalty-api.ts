/**
 * Loyalty API Client
 * Frontend utilities for interacting with the Frontier Club loyalty system
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3013';

export interface TierInfo {
  tier: 'prospector' | 'wrangler' | 'sheriff';
  nextTier: 'prospector' | 'wrangler' | 'sheriff' | null;
  earnMultiplier: number;
  benefits: string[];
  itemsSold: number;
  salesValue: number;
}

export interface TierProgress extends TierInfo {
  itemsToNextTier: number | null;
  salesValueToNextTier: number | null;
  progressPercentage: number;
}

export interface JakeBucksTransaction {
  id: string;
  type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export interface JakeBucksBalance {
  balance: number;
  recentTransactions: JakeBucksTransaction[];
}

export interface RedemptionItem {
  id: string;
  name: string;
  description: string;
  cost: number;
  value_usd: number;
  type: string;
  tier_requirement: 'prospector' | 'wrangler' | 'sheriff' | null;
  available: boolean;
  user_redemption_count?: number;
  max_redemptions_per_user?: number;
}

export interface RedemptionCatalog {
  items: RedemptionItem[];
}

/**
 * Get user's current tier information
 */
export async function getTierInfo(authToken: string): Promise<TierInfo> {
  const response = await fetch(`${API_BASE}/api/v1/loyalty/tier`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch tier info');
  }

  return response.json();
}

/**
 * Get detailed progress toward next tier
 */
export async function getTierProgress(authToken: string): Promise<TierProgress> {
  const response = await fetch(`${API_BASE}/api/v1/loyalty/progress`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch tier progress');
  }

  return response.json();
}

/**
 * Get Jake Bucks balance and transaction history
 */
export async function getJakeBucksBalance(authToken: string): Promise<JakeBucksBalance> {
  const response = await fetch(`${API_BASE}/api/v1/loyalty/bucks`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch Jake Bucks balance');
  }

  return response.json();
}

/**
 * Get redemption catalog with user-specific availability
 */
export async function getRedemptionCatalog(authToken: string): Promise<RedemptionCatalog> {
  const response = await fetch(`${API_BASE}/api/v1/loyalty/redemptions`, {
    headers: {
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch redemption catalog');
  }

  return response.json();
}

/**
 * Redeem Jake Bucks for a specific item
 */
export async function redeemBucks(
  authToken: string,
  redemptionId: string
): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`${API_BASE}/api/v1/loyalty/redemptions/${redemptionId}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to redeem Jake Bucks');
  }

  return response.json();
}
