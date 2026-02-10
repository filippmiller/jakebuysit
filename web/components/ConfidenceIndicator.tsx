"use client";

import { motion } from "framer-motion";
import { HelpCircle, CheckCircle, AlertCircle, XCircle } from "lucide-react";
import { useState } from "react";

interface ConfidenceIndicatorProps {
  confidence: number; // 0-100
  confidenceFactors?: {
    dataPoints?: number;
    recencyScore?: number;
    priceVariance?: string;
    categoryCoverage?: string;
    explanation?: string;
  };
  className?: string;
}

export function ConfidenceIndicator({
  confidence,
  confidenceFactors,
  className = "",
}: ConfidenceIndicatorProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  const getConfidenceLevel = (score: number) => {
    if (score >= 80) return "high";
    if (score >= 50) return "medium";
    return "low";
  };

  const level = getConfidenceLevel(confidence);

  const levelConfig = {
    high: {
      color: "from-emerald-500 to-green-400",
      bgColor: "bg-emerald-500/10",
      textColor: "text-emerald-300",
      icon: CheckCircle,
      label: "Very Confident",
      defaultExplanation:
        "High confidence based on 10+ recent sales with consistent pricing",
    },
    medium: {
      color: "from-amber-500 to-yellow-400",
      bgColor: "bg-amber-500/10",
      textColor: "text-amber-300",
      icon: AlertCircle,
      label: "Moderately Confident",
      defaultExplanation:
        "Moderate confidence based on limited data or higher price variance",
    },
    low: {
      color: "from-red-500 to-orange-400",
      bgColor: "bg-red-500/10",
      textColor: "text-red-300",
      icon: XCircle,
      label: "Lower Confidence",
      defaultExplanation:
        "Lower confidence - rare item or insufficient recent sales data",
    },
  };

  const config = levelConfig[level];
  const Icon = config.icon;

  const explanation =
    confidenceFactors?.explanation || config.defaultExplanation;

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Progress Bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Icon className={`w-4 h-4 ${config.textColor}`} />
            <span className="text-[#a89d8a] font-medium">Pricing Confidence</span>
          </div>
          <span className={`font-bold ${config.textColor}`}>
            {confidence}%
          </span>
        </div>

        <div className="relative h-2.5 bg-white/[0.08] rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 1, ease: "easeOut" }}
            className={`h-full bg-gradient-to-r ${config.color}`}
          />
        </div>
      </div>

      {/* Explanation Card */}
      <div
        className={`relative p-3 ${config.bgColor} border border-white/[0.08] rounded-lg`}
      >
        <button
          className="absolute top-2 right-2"
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          onClick={() => setShowTooltip(!showTooltip)}
        >
          <HelpCircle className="w-4 h-4 text-[#706557] hover:text-[#a89d8a] transition-colors" />
        </button>

        <div className="pr-6">
          <p className="text-xs text-[#c3bbad] leading-relaxed">
            {explanation}
          </p>

          {confidenceFactors && showTooltip && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 pt-3 border-t border-white/[0.08] space-y-1.5"
            >
              {confidenceFactors.dataPoints && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#706557]">Data Points:</span>
                  <span className="text-[#c3bbad] font-medium">
                    {confidenceFactors.dataPoints}
                  </span>
                </div>
              )}
              {confidenceFactors.recencyScore !== undefined && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#706557]">Recency Score:</span>
                  <span className="text-[#c3bbad] font-medium">
                    {confidenceFactors.recencyScore}%
                  </span>
                </div>
              )}
              {confidenceFactors.priceVariance && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#706557]">Price Variance:</span>
                  <span className="text-[#c3bbad] font-medium capitalize">
                    {confidenceFactors.priceVariance}
                  </span>
                </div>
              )}
              {confidenceFactors.categoryCoverage && (
                <div className="flex justify-between text-xs">
                  <span className="text-[#706557]">Category Coverage:</span>
                  <span className="text-[#c3bbad] font-medium capitalize">
                    {confidenceFactors.categoryCoverage}
                  </span>
                </div>
              )}
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
