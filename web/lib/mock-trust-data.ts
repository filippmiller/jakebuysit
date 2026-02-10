/**
 * Mock data generators for Phase 2 Trust Features
 * Used for development and testing before backend APIs are ready
 */

import type { PricingExplanation, ComparablesData } from "./api-client";

/**
 * Generate mock pricing explanation based on offer details
 */
export function generateMockPricingExplanation(
  jakePrice: number,
  marketAvg: number,
  category: string
): PricingExplanation {
  const baseValue = Math.round(marketAvg * 0.7);
  const conditionAdjustment = Math.round(marketAvg * 0.1);
  const marketAdjustment = Math.round(marketAvg * -0.05);
  const finalOffer = jakePrice;

  const jakesNotes = [
    "Fair deal based on current market, partner. This is what I can do.",
    "Market's been slow, but I'm being square with ya on this one.",
    "I've seen a lotta these come through. This is a solid offer.",
    "Now THAT's what I'm talkin' about. Fair price for both of us.",
    "Been in this business a long time. This is the right number.",
  ];

  return {
    steps: [
      {
        label: "Base Market Value",
        value: baseValue,
        explanation: `Starting point based on ${category} market data from eBay, Mercari, and Facebook Marketplace`,
      },
      {
        label: "Condition Adjustment",
        value: conditionAdjustment,
        explanation:
          "Added value for good condition with minimal wear, working perfectly",
      },
      {
        label: "Current Demand",
        value: marketAdjustment,
        explanation:
          "Market's a bit slow right now for this category, adjusted for current inventory levels",
      },
      {
        label: "Resale Risk",
        value: Math.round((finalOffer - baseValue - conditionAdjustment - marketAdjustment)),
        explanation:
          "My margin to cover inspection, listing, storage, and selling costs",
      },
    ],
    jakesNote: jakesNotes[Math.floor(Math.random() * jakesNotes.length)],
  };
}

/**
 * Generate mock market comparables
 */
export function generateMockComparables(
  itemName: string,
  marketAvg: number,
  category: string
): ComparablesData {
  const sources = ["ebay", "mercari", "offerup", "facebook"] as const;
  const now = Date.now();

  const comparables = Array.from({ length: 3 }, (_, i) => {
    const priceVariation = 0.85 + Math.random() * 0.3; // 85% to 115%
    const price = Math.round(marketAvg * priceVariation);
    const daysAgo = Math.floor(Math.random() * 30) + 1;
    const soldDate = new Date(now - daysAgo * 24 * 60 * 60 * 1000).toISOString();
    const source = sources[Math.floor(Math.random() * sources.length)];

    return {
      title: `${itemName} - ${["Like New", "Good Condition", "Excellent"][i]}`,
      price,
      imageUrl: `https://via.placeholder.com/300x200?text=${encodeURIComponent(
        itemName
      )}`,
      soldDate,
      source,
      url: `https://${source}.com/sold/${Math.random().toString(36).substring(7)}`,
    };
  });

  return {
    comparables,
    averagePrice: Math.round(
      comparables.reduce((sum, c) => sum + c.price, 0) / comparables.length
    ),
  };
}

/**
 * Check if we should use mock data (for development)
 */
export function shouldUseMockData(): boolean {
  if (typeof window === "undefined") return false;

  // Use mock data if:
  // 1. In development mode
  // 2. localStorage flag is set
  const isDev = process.env.NODE_ENV === "development";
  const mockFlag = localStorage.getItem("useMockTrustData") === "true";

  return isDev || mockFlag;
}
