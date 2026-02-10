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

/**
 * Generate mock comparable sales for demo purposes
 * (Remove when backend provides real data)
 */
function generateMockComparables(
  itemName: string,
  fmv: number,
  condition: string
): ComparableSale[] {
  const sources = ["ebay", "facebook", "amazon"];
  const conditions = ["Excellent", "Good", "Fair"];
  const sales: ComparableSale[] = [];

  for (let i = 0; i < 3; i++) {
    const variance = 0.85 + Math.random() * 0.3; // ±15%
    const daysAgo = Math.floor(Math.random() * 30);
    const soldDate = new Date();
    soldDate.setDate(soldDate.getDate() - daysAgo);

    sales.push({
      source: sources[i % sources.length],
      title: `${itemName} - ${conditions[i % conditions.length]}`,
      price: Math.round(fmv * variance * 100) / 100,
      soldDate: soldDate.toISOString(),
      condition: conditions[i % conditions.length],
      url: `https://example.com/listing-${i}`,
    });
  }

  return sales;
}

/**
 * Generate mock confidence factors for demo purposes
 * (Remove when backend provides real data)
 */
function generateMockConfidenceFactors(
  confidence: number,
  comparablesCount: number
): ConfidenceFactors {
  const dataPoints = Math.max(10, comparablesCount * 5);
  const recencyScore = confidence > 80 ? 95 : confidence > 50 ? 75 : 60;
  const priceVariance = confidence > 80 ? "low" : confidence > 50 ? "medium" : "high";
  const categoryCoverage = confidence > 80 ? "high" : confidence > 50 ? "medium" : "low";

  let explanation = "";
  if (confidence >= 80) {
    explanation = `High confidence: ${dataPoints} recent sales, ${priceVariance} price variance, ${categoryCoverage} category coverage`;
  } else if (confidence >= 50) {
    explanation = `Moderate confidence: ${dataPoints} data points, ${priceVariance} price variance across recent sales`;
  } else {
    explanation = `Lower confidence: Limited data (${dataPoints} points), ${priceVariance} price variance, or rare item`;
  }

  return {
    dataPoints,
    recencyScore,
    priceVariance,
    categoryCoverage,
    explanation,
  };
}

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

  // Extract comparable sales from marketData (or generate mock data)
  let comparableSales: ComparableSale[] | undefined;
  let comparablesCount = 0;

  if (backendOffer.marketData?.comparable_sales) {
    comparableSales = backendOffer.marketData.comparable_sales;
    comparablesCount = comparableSales?.length || 0;
  } else if (backendOffer.marketData?.ebay?.sold_count) {
    comparablesCount = backendOffer.marketData.ebay.sold_count;
    // Generate mock comparable sales for demo
    comparableSales = generateMockComparables(
      item?.brand && item?.model
        ? `${item.brand} ${item.model}`
        : "Item",
      fmv,
      item?.condition || "Good"
    );
  } else {
    // Fallback: generate mock data
    comparablesCount = 15;
    comparableSales = generateMockComparables(
      item?.brand && item?.model
        ? `${item.brand} ${item.model}`
        : "Item",
      fmv,
      item?.condition || "Good"
    );
  }

  // Extract or generate confidence factors
  const aiConfidence = backendOffer.aiConfidence || 0.85;
  const fmvConfidence = pricing?.fmvConfidence || 0.85;
  const overallConfidence = Math.round((aiConfidence + fmvConfidence) / 2 * 100) / 100;

  const confidenceFactors: ConfidenceFactors | undefined =
    backendOffer.marketData?.confidence_factors ||
    generateMockConfidenceFactors(overallConfidence * 100, comparablesCount);

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
