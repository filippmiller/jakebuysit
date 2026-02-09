export interface EscalatedOffer {
  id: string;
  offerId: string;
  reason: 'low_confidence' | 'high_value' | 'few_comparables' | 'risk_category' | 'user_dispute';
  escalatedAt: string;
  ageMinutes: number;
  slaViolated: boolean;

  // Full offer data
  offer: {
    id: string;
    userId: string;
    userEmail: string;
    photos: string[];
    identification: any;
    pricing: any;
    jake: any;
  };

  // Suggested resolution
  suggestedOffer: number;
  aiReasoning: string;

  // Review data
  claimedBy?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  resolution?: 'approved' | 'custom_price' | 'rejected' | 'fraud';
  customPrice?: number;
  reviewNotes?: string;

  // History
  previousReviews?: Array<{
    reviewedBy: string;
    reviewedAt: string;
    resolution: string;
    notes: string;
  }>;
}

export interface EscalationDecision {
  action: 'approve' | 'custom' | 'reject' | 'fraud' | 'request_more_info';
  customPrice?: number;
  reason?: string;
  notes?: string;
}
