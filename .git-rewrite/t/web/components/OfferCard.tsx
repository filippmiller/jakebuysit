"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Clock, TrendingUp, Package, ChevronRight } from "lucide-react";
import { JakeVoice } from "./JakeVoice";
import { JakeCharacter } from "./JakeCharacter";
import { formatCurrency, formatTimeRemaining } from "@/lib/utils";
import { getJakeStateForOffer } from "@/lib/jake-scripts";

interface OfferCardProps {
  offer: {
    id: string;
    itemName: string;
    brand?: string;
    model?: string;
    condition: string;
    category: string;
    jakePrice: number;
    marketAvg: number;
    marketRange: { min: number; max: number };
    comparablesCount: number;
    confidence: number;
    jakeVoiceUrl: string;
    jakeScript: string;
    expiresAt: string;
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
  const expiresAt = new Date(offer.expiresAt);
  const jakeState = getJakeStateForOffer(
    offer.jakePrice,
    offer.marketAvg,
    offer.confidence
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`offer-card max-w-2xl mx-auto ${className}`}
    >
      {/* Jake Character */}
      <div className="mb-6">
        <JakeCharacter state={jakeState} className="w-full h-48" />
      </div>

      {/* Item Identification */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
        <div className="text-center mb-6">
          <h2 className="text-3xl font-bold text-dusty-800 mb-2">
            {offer.itemName}
          </h2>
          <div className="flex justify-center gap-2 text-sm text-dusty-600">
            {offer.brand && (
              <span className="px-3 py-1 bg-gray-100 rounded-full">
                {offer.brand}
              </span>
            )}
            {offer.model && (
              <span className="px-3 py-1 bg-gray-100 rounded-full">
                {offer.model}
              </span>
            )}
            <span className="px-3 py-1 bg-gray-100 rounded-full">
              {offer.condition}
            </span>
          </div>
        </div>

        {/* Jake's Price */}
        <div className="text-center mb-6 py-8 bg-gradient-to-br from-saloon-50 to-saloon-100 rounded-xl border-4 border-saloon-400">
          <p className="text-lg text-dusty-700 mb-2">Jake's Offer</p>
          <p className="text-6xl font-bold text-saloon-600">
            {formatCurrency(offer.jakePrice)}
          </p>
          <p className="text-sm text-dusty-600 mt-2">Cash, right now</p>
        </div>

        {/* Confidence Indicator */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden max-w-xs">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${offer.confidence * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full bg-green-500"
            />
          </div>
          <span className="text-sm text-dusty-600">
            {Math.round(offer.confidence * 100)}% confident
          </span>
        </div>

        {/* Market Context */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors mb-4"
        >
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-saloon-600" />
            <span className="font-medium text-dusty-800">
              Market Analysis
            </span>
          </div>
          <ChevronRight
            className={`w-5 h-5 text-dusty-600 transition-transform ${
              showDetails ? "rotate-90" : ""
            }`}
          />
        </button>

        {showDetails && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="mb-4 p-4 bg-gray-50 rounded-lg"
          >
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-dusty-600 mb-1">Market Avg</p>
                <p className="text-xl font-bold text-dusty-800">
                  {formatCurrency(offer.marketAvg)}
                </p>
              </div>
              <div>
                <p className="text-sm text-dusty-600 mb-1">Range</p>
                <p className="text-xl font-bold text-dusty-800">
                  {formatCurrency(offer.marketRange.min)} -{" "}
                  {formatCurrency(offer.marketRange.max)}
                </p>
              </div>
              <div>
                <p className="text-sm text-dusty-600 mb-1">Comparables</p>
                <p className="text-xl font-bold text-dusty-800">
                  {offer.comparablesCount}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Expiry Timer */}
        <div className="flex items-center justify-center gap-2 text-sm text-dusty-600 mb-6">
          <Clock className="w-4 h-4" />
          <span>{formatTimeRemaining(expiresAt)}</span>
        </div>

        {/* Jake Voice Message */}
        <JakeVoice
          audioUrl={offer.jakeVoiceUrl}
          transcript={offer.jakeScript}
          autoPlay
          className="mb-6"
        />

        {/* Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button
            onClick={onDecline}
            className="py-4 px-6 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-lg transition-colors"
          >
            No Thanks
          </button>
          <button
            onClick={onAccept}
            className="py-4 px-6 bg-saloon-500 hover:bg-saloon-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Package className="w-5 h-5" />
            Accept Deal
          </button>
        </div>
      </div>

      {/* Trust Signal */}
      <p className="text-center text-sm text-dusty-600">
        Deal! Let's get you paid. 🤝
      </p>
    </motion.div>
  );
}
