"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Clock, TrendingUp, Package, ChevronRight } from "lucide-react";
import { JakeVoice } from "./JakeVoice";
import { JakeCharacter } from "./JakeCharacter";
import { ConditionBadge } from "./ConditionBadge";
import { ConfidenceIndicator } from "./ConfidenceIndicator";
import { ComparableSalesTable } from "./ComparableSalesTable";
import { PricingBreakdown } from "./PricingBreakdown";
import { ComparablesSection } from "./ComparablesSection";
import { PriceLockCountdown } from "./PriceLockCountdown";
import { formatCurrency, formatTimeRemaining } from "@/lib/utils";
import { getJakeStateForOffer } from "@/lib/jake-scripts";
import type { ComparableSale, PricingExplanation, ComparablesData } from "@/lib/api-client";
import { apiClient } from "@/lib/api-client";
import {
  generateMockPricingExplanation,
  generateMockComparables,
  shouldUseMockData,
} from "@/lib/mock-trust-data";

interface OfferCardProps {
  offer: {
    id: string;
    itemName: string;
    brand?: string;
    model?: string;
    condition: string;
    conditionGrade?: string;
    conditionNotes?: string;
    category: string;
    jakePrice: number;
    marketAvg: number;
    marketRange: { min: number; max: number };
    comparablesCount: number;
    comparableSales?: ComparableSale[];
    confidence: number;
    confidenceFactors?: {
      dataPoints?: number;
      recencyScore?: number;
      priceVariance?: string;
      categoryCoverage?: string;
      explanation?: string;
    };
    pricingConfidence?: number;
    jakeVoiceUrl: string;
    jakeScript: string;
    expiresAt: string;
    estimatedProfit?: number; // Profit if sold at FMV
    // Phase 4 Team 1: Enhanced metadata
    serialNumber?: string;
    productMetadata?: {
      brand?: string;
      model?: string;
      variant?: string;
      storage?: string;
      color?: string;
      year?: number;
      generation?: string;
      condition_specifics?: Record<string, any>;
    };
  };
  onAccept: () => void;
  onDecline: () => void;
  className?: string;
}

export function OfferCard({
  offer,
  onAccept,
  onDecline,
  className = "",
}: OfferCardProps) {
  const [showDetails, setShowDetails] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);
  const [comparablesData, setComparablesData] = useState<ComparablesData | null>(null);
  const [pricingExplanation, setPricingExplanation] = useState<PricingExplanation | null>(null);
  const [loadingExtras, setLoadingExtras] = useState(true);
  const prefersReducedMotion = useReducedMotion();
  const expiresAt = new Date(offer.expiresAt);
  const jakeState = getJakeStateForOffer(
    offer.jakePrice,
    offer.marketAvg,
    offer.confidence
  );

  // Fetch Phase 2 trust features data
  useEffect(() => {
    const fetchTrustData = async () => {
      try {
        // Use mock data in development if backend APIs not ready
        if (shouldUseMockData()) {
          console.log("[Dev Mode] Using mock trust features data");
          setComparablesData(
            generateMockComparables(offer.itemName, offer.marketAvg, offer.category)
          );
          setPricingExplanation(
            offer.pricingExplanation ||
              generateMockPricingExplanation(
                offer.jakePrice,
                offer.marketAvg,
                offer.category
              )
          );
          setLoadingExtras(false);
          return;
        }

        // Fetch real data from backend
        const [comparables, explanation] = await Promise.all([
          apiClient.getOfferComparables(offer.id),
          apiClient.getPricingExplanation(offer.id),
        ]);
        setComparablesData(comparables);
        setPricingExplanation(explanation || offer.pricingExplanation || null);
      } catch (error) {
        console.warn("Failed to fetch trust features data:", error);
        // Fallback to mock data on error in development
        if (process.env.NODE_ENV === "development") {
          setComparablesData(
            generateMockComparables(offer.itemName, offer.marketAvg, offer.category)
          );
          setPricingExplanation(
            generateMockPricingExplanation(
              offer.jakePrice,
              offer.marketAvg,
              offer.category
            )
          );
        }
      } finally {
        setLoadingExtras(false);
      }
    };

    fetchTrustData();
  }, [offer.id, offer.pricingExplanation, offer.itemName, offer.marketAvg, offer.category, offer.jakePrice]);

  // Live countdown timer
  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = expiresAt.getTime() - now.getTime();
      if (diff <= 0) {
        setTimeRemaining("Expired");
        setIsUrgent(true);
        return;
      }
      const hours = Math.floor(diff / 3600000);
      const minutes = Math.floor((diff % 3600000) / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);
      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m remaining`);
      } else if (minutes > 0) {
        setTimeRemaining(`${minutes}m ${seconds}s remaining`);
      } else {
        setTimeRemaining(`${seconds}s remaining`);
      }
      setIsUrgent(diff < 3600000); // urgent when < 1 hour
    };
    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [offer.expiresAt]);

  const handleAccept = useCallback(() => {
    if (prefersReducedMotion) {
      onAccept();
      return;
    }
    setShowConfetti(true);
    setTimeout(() => onAccept(), 800);
  }, [onAccept, prefersReducedMotion]);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`offer-card max-w-2xl mx-auto relative ${className}`}
    >
      {/* Confetti burst on accept */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none z-50 overflow-hidden">
          {Array.from({ length: 24 }).map((_, i) => {
            const angle = (i / 24) * 360;
            const distance = 120 + Math.random() * 180;
            const x = Math.cos((angle * Math.PI) / 180) * distance;
            const y = Math.sin((angle * Math.PI) / 180) * distance - 100;
            const colors = ['#f59e0b', '#fbbf24', '#d97706', '#92400e', '#fef3c7', '#78350f'];
            const color = colors[i % colors.length];
            const size = 6 + Math.random() * 8;
            return (
              <motion.div
                key={i}
                initial={{ x: '50%', y: '50%', scale: 0, opacity: 1 }}
                animate={{
                  x: `calc(50% + ${x}px)`,
                  y: `calc(50% + ${y}px)`,
                  scale: [0, 1.5, 1],
                  opacity: [1, 1, 0],
                  rotate: Math.random() * 720,
                }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  position: 'absolute',
                  width: size,
                  height: size,
                  backgroundColor: color,
                  borderRadius: Math.random() > 0.5 ? '50%' : '2px',
                }}
              />
            );
          })}
        </div>
      )}
      {/* Jake Character */}
      <div className="mb-6">
        <JakeCharacter state={jakeState} className="w-full h-48" />
      </div>

      {/* Item Identification */}
      <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6 mb-4">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-[#f5f0e8] mb-3">
            {offer.itemName}
          </h2>
          <div className="flex justify-center gap-2 text-sm flex-wrap">
            {offer.brand && (
              <span className="px-3 py-1 bg-white/[0.08] border border-white/[0.1] rounded-full text-[#c3bbad]">
                {offer.brand}
              </span>
            )}
            {offer.model && (
              <span className="px-3 py-1 bg-white/[0.08] border border-white/[0.1] rounded-full text-[#c3bbad]">
                {offer.model}
              </span>
            )}
            <ConditionBadge
              condition={offer.conditionGrade || offer.condition}
              size="md"
            />
          </div>
          {offer.conditionNotes && (
            <p className="mt-3 text-sm text-[#a89d8a] italic">
              {offer.conditionNotes}
            </p>
          )}
        </div>

        {/* Jake's Price */}
        <div className="text-center mb-6 py-8 bg-gradient-to-br from-amber-500/[0.12] to-amber-400/[0.06] rounded-xl border border-amber-400/20">
          <p className="text-lg text-[#a89d8a] mb-2">Jake&apos;s Offer</p>
          <p className="text-6xl font-bold bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">
            {formatCurrency(offer.jakePrice)}
          </p>
          <p className="text-sm text-[#706557] mt-2">Cash, right now</p>
          {offer.estimatedProfit !== undefined && offer.estimatedProfit > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-400/20">
              <p className="text-xs text-[#706557] mb-1">Your potential profit if sold at market value</p>
              <p className="text-2xl font-bold text-green-400">
                +{formatCurrency(offer.estimatedProfit)}
              </p>
            </div>
          )}
        </div>

        {/* Enhanced Confidence Indicator */}
        <div className="mb-6">
          <ConfidenceIndicator
            confidence={Math.round((offer.pricingConfidence ?? offer.confidence) * 100)}
            confidenceFactors={offer.confidenceFactors}
          />
        </div>

        {/* Phase 2 Trust Feature: Pricing Breakdown */}
        {pricingExplanation && (
          <div className="mb-6">
            <PricingBreakdown
              steps={pricingExplanation.steps}
              finalOffer={offer.jakePrice}
              confidence={offer.pricingConfidence ?? offer.confidence}
              jakesNote={pricingExplanation.jakesNote}
            />
          </div>
        )}

        {/* Market Context */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between p-4 bg-white/[0.05] border border-white/[0.08] rounded-lg hover:bg-white/[0.08] transition-colors mb-4"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-amber-400" />
            <span className="font-medium text-[#f5f0e8]">
              Market Analysis
            </span>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-[#706557] transition-transform ${
              showDetails ? "rotate-90" : ""
            }`}
          />
        </button>

        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 space-y-4"
          >
            {/* Market Stats */}
            <div className="p-4 bg-white/[0.04] border border-white/[0.08] rounded-lg">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-sm text-[#706557] mb-1">Market Avg</p>
                  <p className="text-xl font-bold text-[#f5f0e8]">
                    {formatCurrency(offer.marketAvg)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#706557] mb-1">Range</p>
                  <p className="text-lg font-bold text-[#f5f0e8]">
                    {formatCurrency(offer.marketRange.min)} -{" "}
                    {formatCurrency(offer.marketRange.max)}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#706557] mb-1">Sales Found</p>
                  <p className="text-xl font-bold text-[#f5f0e8]">
                    {offer.comparablesCount}
                  </p>
                </div>
              </div>
            </div>

            {/* Product Details (Serial & Metadata) */}
            {(offer.serialNumber || offer.productMetadata) && (
              <div className="p-4 bg-white/[0.04] border border-white/[0.08] rounded-lg">
                <h4 className="text-sm font-semibold text-[#f5f0e8] mb-3">Product Details</h4>
                <div className="space-y-2 text-sm">
                  {offer.serialNumber && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#706557]">Serial Number:</span>
                      <span className="text-[#f5f0e8] font-mono">{offer.serialNumber}</span>
                    </div>
                  )}
                  {offer.productMetadata?.variant && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#706557]">Variant:</span>
                      <span className="text-[#f5f0e8]">{offer.productMetadata.variant}</span>
                    </div>
                  )}
                  {offer.productMetadata?.storage && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#706557]">Storage:</span>
                      <span className="text-[#f5f0e8]">{offer.productMetadata.storage}</span>
                    </div>
                  )}
                  {offer.productMetadata?.color && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#706557]">Color:</span>
                      <span className="text-[#f5f0e8]">{offer.productMetadata.color}</span>
                    </div>
                  )}
                  {offer.productMetadata?.year && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#706557]">Year:</span>
                      <span className="text-[#f5f0e8]">{offer.productMetadata.year}</span>
                    </div>
                  )}
                  {offer.productMetadata?.generation && (
                    <div className="flex justify-between items-center">
                      <span className="text-[#706557]">Generation:</span>
                      <span className="text-[#f5f0e8]">{offer.productMetadata.generation}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Comparable Sales Table */}
            {offer.comparableSales && offer.comparableSales.length > 0 && (
              <ComparableSalesTable sales={offer.comparableSales} />
            )}
          </motion.div>
        )}

        {/* Phase 2 Trust Feature: Market Comparables */}
        {comparablesData && comparablesData.comparables.length > 0 && (
          <ComparablesSection
            comparables={comparablesData.comparables}
            averagePrice={comparablesData.averagePrice}
            userOffer={offer.jakePrice}
          />
        )}

        {/* Phase 2 Trust Feature: Price Lock Countdown */}
        <div className="mb-6">
          <PriceLockCountdown
            expiresAt={offer.expiresAt}
            isExpired={offer.isExpired || false}
          />
        </div>

        {/* Jake Voice Message */}
        <JakeVoice
          audioUrl={offer.jakeVoiceUrl}
          transcript={offer.jakeScript}
          autoPlay
          className="mb-6"
        />

        {/* Trust Signals */}
        <div className="mb-6 p-4 bg-gradient-to-br from-amber-500/[0.08] to-amber-400/[0.04] border border-amber-400/20 rounded-lg">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">
              <Package className="w-5 h-5 text-amber-400" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-amber-300">
                Jake's Guarantee
              </h4>
              <ul className="text-xs text-[#c3bbad] space-y-1">
                <li>✓ Free shipping label included</li>
                <li>✓ Payment within 24 hours of receiving your item</li>
                <li>✓ No hidden fees or surprises</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onDecline}
            className="py-4 px-6 bg-white/[0.08] hover:bg-white/[0.12] border border-white/[0.1] text-[#a89d8a] font-semibold rounded-lg transition-colors"
          >
            No Thanks
          </button>
          <button
            onClick={handleAccept}
            disabled={showConfetti || offer.isExpired}
            className={`py-4 px-6 font-semibold rounded-lg transition-all flex items-center justify-center gap-2 ${
              offer.isExpired
                ? "bg-gray-600 text-gray-400 cursor-not-allowed opacity-50"
                : "bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-[#1a1510] shadow-[0_4px_16px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_24px_rgba(245,158,11,0.3)] disabled:opacity-70"
            }`}
          >
            <Package className="w-5 h-5" />
            {offer.isExpired ? "Offer Expired" : showConfetti ? "Deal!" : "Accept Deal"}
          </button>
        </div>
      </div>

      {/* Trust Signal */}
      <p className="text-center text-sm text-[#706557] mt-4">
        Fair and square, partner.
      </p>
    </motion.div>
  );
}
