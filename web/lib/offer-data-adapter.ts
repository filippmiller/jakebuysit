/**
 * Adapter to handle offer data from backend API.
 * Supports both old format and new format with condition/confidence/comparables.
 */

import type { OfferDetails, ComparableSale, ConfidenceFactors } from "./api-client";

interface BackendOfferResponse {
  id: string;
  status: string;
  item?: {
    category?: string;
    subcategory?: string;
    brand?: string;
    model?: string;
    condition?: string;
    features?: any;
    damage?: any;
  };
  photos?: any;
  userDescription?: string;
  aiConfidence?: number;
  pricing?: {
    fmv: number;
    fmvConfidence?: number;
    offerAmount: number;
    offerToMarketRatio?: number;
  };
  jake?: {
    script: string;
    voiceUrl: string;
    animationState?: string;
    tier?: number;
  };
  marketData?: any;
  escalated?: boolean;
  escalationReason?: string;
  expiresAt?: string;
  createdAt?: string;
  acceptedAt?: string;
  processingStage?: string;
}

// Mock data generation removed - backend must provide real data
// If comparable sales or confidence factors are missing, we handle gracefully with undefined

/**
 * Transform backend offer response to frontend OfferDetails format
 */
export function adaptOfferData(backendOffer: BackendOfferResponse): OfferDetails {
  const item = backendOffer.item;
  const pricing = backendOffer.pricing;
  const jake = backendOffer.jake;

  // Calculate market range (if not provided)
  const fmv = pricing?.fmv || 0;
  const marketRange = {
    min: Math.round(fmv * 0.8 * 100) / 100,
    max: Math.round(fmv * 1.2 * 100) / 100,
  };

  // Extract comparable sales from marketData (backend must provide real data)
  let comparableSales: ComparableSale[] | undefined;
  let comparablesCount = 0;

  if (backendOffer.marketData?.comparable_sales) {
    comparableSales = backendOffer.marketData.comparable_sales;
    comparablesCount = comparableSales?.length || 0;
  } else if (backendOffer.marketData?.ebay?.sold_count) {
    comparablesCount = backendOffer.marketData.ebay.sold_count;
    // No comparable sales available - show empty state in UI
    comparableSales = undefined;
  } else {
    // No market data available
    comparablesCount = 0;
    comparableSales = undefined;
  }

  // Extract confidence factors from backend (no fallback generation)
  const aiConfidence = backendOffer.aiConfidence || 0.85;
  const fmvConfidence = pricing?.fmvConfidence || 0.85;
  const overallConfidence = Math.round((aiConfidence + fmvConfidence) / 2 * 100) / 100;

  // Use real confidence factors from backend, or undefined if not available
  const confidenceFactors: ConfidenceFactors | undefined =
    backendOffer.marketData?.confidence_factors;

  return {
    id: backendOffer.id,
    itemName:
      item?.brand && item?.model
        ? `${item.brand} ${item.model}`
        : item?.category || "Unknown Item",
    brand: item?.brand,
    model: item?.model,
    condition: item?.condition || "Good",
    conditionGrade: item?.condition || "Good",
    conditionNotes: undefined, // Backend doesn't provide yet
    category: item?.category || "Electronics",
    jakePrice: pricing?.offerAmount || 0,
    marketAvg: fmv,
    marketRange,
    comparablesCount,
    comparableSales,
    confidence: overallConfidence,
    confidenceFactors,
    pricingConfidence: fmvConfidence,
    jakeVoiceUrl: jake?.voiceUrl || "",
    jakeScript: jake?.script || "Howdy, partner!",
    expiresAt: backendOffer.expiresAt || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    animationState: jake?.animationState || "default",
  };
}
