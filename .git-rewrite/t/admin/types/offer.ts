export interface OfferData {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;

  // Item details
  photos: string[];
  userDescription?: string;

  // AI Identification
  identification: {
    category: string;
    subcategory: string;
    brand: string;
    model: string;
    condition: 'New' | 'Like New' | 'Good' | 'Fair' | 'Poor';
    features: string[];
    damageNotes: string[];
    confidence: number;
    modelUsed: 'Claude' | 'GPT-4o' | 'Gemini';
  };

  // Pricing
  pricing: {
    fmv: number;
    ebayMedian: number;
    ebayListingCount: number;
    amazonAvg: number;
    googleShoppingAvg: number;
    conditionMultiplier: number;
    categoryMargin: number;
    dynamicAdjustments: {
      velocityBonus: number;
      inventorySaturation: number;
      loyaltyBonus: number;
    };
    finalOffer: number;
    offerToMarketRatio: number;
  };

  // Jake
  jake: {
    script: string;
    audioUrl: string;
    animationState: string;
    tier: 1 | 2 | 3;
    played: boolean;
    completed: boolean;
  };

  // Status
  status: 'processing' | 'ready' | 'accepted' | 'escalated' | 'rejected' | 'fraud';
  timeline: {
    processingStarted: string;
    visionComplete: string;
    marketplaceResearchComplete: string;
    offerReady: string;
  };

  // Timestamps
  createdAt: string;
  updatedAt: string;
}

export interface OfferFilters {
  status: string;
  category: string;
  confidence: string;
  dateRange: { from: Date; to: Date } | null;
  search: string;
}
