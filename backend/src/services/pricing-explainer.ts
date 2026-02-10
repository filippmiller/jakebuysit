/**
 * Pricing Explainer — generates transparent pricing breakdowns for trust-building.
 *
 * Research: Google PAIR explainability (40% trust increase)
 * Task: Phase 2, Task 3 — Transparent Pricing Breakdown
 */

interface PricingBreakdownStep {
  label: string;
  value: number;
  explanation: string;
}

interface PricingBreakdown {
  base_value: number;
  base_value_source: string;
  base_value_explanation: string;

  condition_adjustment: number;
  condition_explanation: string;

  category_margin: number;
  category_explanation: string;

  final_offer: number;
  confidence: number;

  volume_adjustment?: number;
  volume_explanation?: string;

  // Formatted steps for frontend display
  steps: PricingBreakdownStep[];
  jakes_note: string;
}

interface GenerateBreakdownParams {
  fmv: number; // Fair market value
  condition: string; // 'New', 'Like New', 'Good', 'Fair', 'Poor'
  conditionMultiplier: number; // The multiplier applied
  category: string;
  categoryMargin: number; // e.g., 0.6 for 60%
  offerAmount: number;
  confidence: number; // 0-100
  comparableCount?: number; // Number of comparable sales found
  dynamicAdjustments?: { velocity?: number; inventory?: number };
}

/**
 * Category-specific margin explanations.
 */
const CATEGORY_MARGIN_EXPLANATIONS: Record<string, string> = {
  'Consumer Electronics': 'Electronics resell at 60% of market value (standard pawn margin)',
  'Phones & Tablets': 'Mobile devices resell at 65% due to high demand and fast turnover',
  'Gaming': 'Gaming items resell at 70% (strong secondary market)',
  'Computers & Laptops': 'Computers resell at 55% (rapid depreciation and tech changes)',
  'Jewelry & Watches': 'Luxury items resell at 75% (proven market value)',
  'Tools & Equipment': 'Tools resell at 65% (durable, consistent demand)',
  'Collectibles & Vintage': 'Collectibles resell at 50% (niche market, harder to move)',
  'default': 'Standard pawn margin for this category',
};

/**
 * Condition adjustment explanations.
 */
const CONDITION_EXPLANATIONS: Record<string, (adjustment: number) => string> = {
  'New': () => 'New condition — no adjustment',
  'Like New': (adj) => `Like New condition — minimal wear detected (${Math.abs(adj)}% discount)`,
  'Good': (adj) => `Good condition — normal use wear (${Math.abs(adj)}% discount)`,
  'Fair': (adj) => `Fair condition — noticeable wear and defects (${Math.abs(adj)}% discount)`,
  'Poor': (adj) => `Poor condition — significant damage (${Math.abs(adj)}% discount)`,
};

export const pricingExplainer = {
  /**
   * Generate a transparent pricing breakdown.
   */
  generateBreakdown(params: GenerateBreakdownParams): PricingBreakdown {
    const {
      fmv,
      condition,
      conditionMultiplier,
      category,
      categoryMargin,
      offerAmount,
      confidence,
      comparableCount = 0,
      dynamicAdjustments,
    } = params;

    // Step 1: Base value
    const baseValueSource = comparableCount > 0
      ? `Based on ${comparableCount} similar items sold in last 30 days`
      : 'Estimated market value from category averages';

    const baseValueExplanation = comparableCount >= 10
      ? `Strong market data: ${comparableCount} comparable sales`
      : comparableCount >= 5
        ? `Good market data: ${comparableCount} comparable sales`
        : comparableCount > 0
          ? `Limited market data: ${comparableCount} comparable sales`
          : 'Estimated value based on category trends';

    // Step 2: Condition adjustment
    const adjustedValue = fmv * conditionMultiplier;
    const conditionAdjustment = adjustedValue - fmv;
    const conditionPercent = Math.round((1 - conditionMultiplier) * 100);

    const conditionExplanation = CONDITION_EXPLANATIONS[condition]?.(conditionPercent)
      || `Condition adjustment: ${conditionPercent}% discount`;

    // Step 3: Category margin
    const categoryMarginPercent = Math.round(categoryMargin * 100);
    const categoryExplanation = CATEGORY_MARGIN_EXPLANATIONS[category]
      || CATEGORY_MARGIN_EXPLANATIONS['default'];

    // Step 4: Volume adjustments (if any)
    let volumeAdjustment: number | undefined;
    let volumeExplanation: string | undefined;

    if (dynamicAdjustments) {
      const velocityFactor = dynamicAdjustments.velocity || 1.0;
      const inventoryFactor = dynamicAdjustments.inventory || 1.0;
      const totalFactor = velocityFactor * inventoryFactor;

      if (totalFactor !== 1.0) {
        const baseOfferBeforeVolume = adjustedValue * categoryMargin;
        const volumeAdjusted = baseOfferBeforeVolume * totalFactor;
        volumeAdjustment = volumeAdjusted - baseOfferBeforeVolume;

        const velocityNote = velocityFactor > 1.0
          ? `+${Math.round((velocityFactor - 1) * 100)}% (high demand)`
          : velocityFactor < 1.0
            ? `${Math.round((velocityFactor - 1) * 100)}% (slow market)`
            : '';

        const inventoryNote = inventoryFactor < 1.0
          ? `, ${Math.round((inventoryFactor - 1) * 100)}% (high inventory)`
          : '';

        volumeExplanation = `Market adjustment: ${velocityNote}${inventoryNote}`;
      }
    }

    // Build step-by-step breakdown
    const steps: PricingBreakdownStep[] = [
      {
        label: 'Base market value',
        value: fmv,
        explanation: baseValueExplanation,
      },
      {
        label: `Condition adjustment (${condition})`,
        value: conditionAdjustment,
        explanation: conditionExplanation,
      },
      {
        label: `Category margin (${categoryMarginPercent}%)`,
        value: adjustedValue * categoryMargin,
        explanation: categoryExplanation,
      },
    ];

    if (volumeAdjustment && volumeExplanation) {
      steps.push({
        label: 'Market adjustment',
        value: volumeAdjustment,
        explanation: volumeExplanation,
      });
    }

    // Jake's note based on offer quality
    const offerToMarketRatio = offerAmount / fmv;
    let jakesNote: string;

    if (offerToMarketRatio >= 0.7) {
      jakesNote = "That's a solid offer, partner. Market's strong for this one.";
    } else if (offerToMarketRatio >= 0.5) {
      jakesNote = "Fair deal based on current market, partner. This is what I can do.";
    } else if (offerToMarketRatio >= 0.3) {
      jakesNote = "Lower than you hoped, I know. Category margin's tight on these.";
    } else {
      jakesNote = "I'll be honest — market's tough on this item. That's my best shot.";
    }

    return {
      base_value: fmv,
      base_value_source: baseValueSource,
      base_value_explanation: baseValueExplanation,

      condition_adjustment: conditionAdjustment,
      condition_explanation: conditionExplanation,

      category_margin: categoryMargin,
      category_explanation: categoryExplanation,

      final_offer: offerAmount,
      confidence,

      volume_adjustment: volumeAdjustment,
      volume_explanation: volumeExplanation,

      steps,
      jakes_note: jakesNote,
    };
  },
};
