"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export interface PricingStep {
  label: string;
  value: number;
  explanation: string;
}

interface PricingBreakdownProps {
  steps: PricingStep[];
  finalOffer: number;
  confidence: number;
  jakesNote: string;
}

export function PricingBreakdown({
  steps,
  finalOffer,
  confidence,
  jakesNote,
}: PricingBreakdownProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const handleToggle = () => {
    setIsExpanded(!isExpanded);

    // Track analytics event when user expands
    if (!isExpanded && typeof window !== "undefined") {
      // Track "Show me the math" clicks for conversion metrics
      if ((window as any).gtag) {
        (window as any).gtag("event", "pricing_breakdown_viewed", {
          event_category: "trust_features",
          event_label: "show_me_the_math",
        });
      }
    }
  };

  return (
    <div className="bg-white/[0.03] backdrop-blur-md rounded-lg border border-white/[0.07] overflow-hidden">
      {/* Toggle Button */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between p-4 hover:bg-white/[0.05] transition-colors"
        aria-expanded={isExpanded}
        aria-controls="pricing-breakdown-details"
      >
        <span className="text-[#c3bbad] font-medium">Show Me the Math</span>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-5 h-5 text-[#a89d8a]" />
        </motion.div>
      </button>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            id="pricing-breakdown-details"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <div className="px-4 pb-4 space-y-3 border-t border-white/[0.07] pt-4">
              {/* Pricing Steps */}
              {steps.map((step, i) => (
                <motion.div
                  key={i}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: i * 0.05 }}
                  className="flex justify-between items-start gap-4"
                >
                  <div className="flex-1">
                    <div className="text-[#f5f0e8] font-medium mb-1">
                      {step.label}
                    </div>
                    <div className="text-sm text-[#a89d8a] leading-relaxed">
                      {step.explanation}
                    </div>
                  </div>
                  <div
                    className={`text-[#f5f0e8] font-mono font-semibold whitespace-nowrap ${
                      step.value > 0 ? "text-green-400" : step.value < 0 ? "text-red-400" : ""
                    }`}
                  >
                    {step.value > 0 ? "+" : ""}${Math.abs(step.value)}
                  </div>
                </motion.div>
              ))}

              {/* Final Offer Section */}
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: steps.length * 0.05 + 0.1 }}
                className="border-t border-white/[0.07] pt-4 mt-4"
              >
                <div className="flex justify-between items-center mb-3">
                  <span className="text-amber-400 font-semibold text-lg">
                    Jake&apos;s Offer
                  </span>
                  <span className="text-amber-400 font-bold text-2xl">
                    ${finalOffer}
                  </span>
                </div>

                {/* Jake's Personal Note */}
                <div className="bg-amber-400/[0.08] border border-amber-400/20 rounded-lg p-3 mb-2">
                  <p className="text-sm text-[#a89d8a] italic leading-relaxed">
                    &ldquo;{jakesNote}&rdquo;
                  </p>
                </div>

                {/* Confidence Score */}
                <div className="flex items-center justify-between text-xs text-[#706557] mt-2">
                  <span>Confidence Score</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
                        style={{ width: `${confidence * 100}%` }}
                      />
                    </div>
                    <span className="font-semibold text-amber-400">
                      {(confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Trust Signal */}
              <p className="text-xs text-[#706557] text-center pt-2">
                Every step calculated from real market data
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
