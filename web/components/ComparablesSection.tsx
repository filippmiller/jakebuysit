"use client";

import { TrendingUp, ExternalLink } from "lucide-react";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";

export interface Comparable {
  title: string;
  price: number;
  imageUrl: string;
  soldDate: string;
  source: "ebay" | "mercari" | "offerup" | "facebook" | "other";
  url: string;
}

interface ComparablesSectionProps {
  comparables: Comparable[];
  averagePrice: number;
  userOffer: number;
}

export function ComparablesSection({
  comparables,
  averagePrice,
  userOffer,
}: ComparablesSectionProps) {
  // Show only top 3 comparables
  const topComparables = comparables.slice(0, 3);
  const offerVsMarket = ((userOffer / averagePrice) * 100).toFixed(0);
  const isBelowMarket = userOffer < averagePrice * 0.9;

  return (
    <div className="mt-6">
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <TrendingUp className="w-5 h-5 text-amber-400" />
        <h3 className="text-[#f5f0e8] font-semibold text-lg">
          Similar Items Recently Sold
        </h3>
      </div>

      {/* Description */}
      <p className="text-sm text-[#a89d8a] mb-6 leading-relaxed">
        Jake found these to help you understand what folks are payin&apos; on
        the market right now.
      </p>

      {/* Comparables Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {topComparables.map((comp, i) => (
          <motion.a
            key={i}
            href={comp.url}
            target="_blank"
            rel="noopener noreferrer"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group bg-white/[0.03] backdrop-blur-md rounded-lg border border-white/[0.07] p-3 hover:border-amber-400/30 hover:bg-white/[0.05] transition-all duration-200"
          >
            {/* Image */}
            <div className="relative w-full h-32 mb-3 rounded overflow-hidden bg-white/[0.05]">
              <img
                src={comp.imageUrl}
                alt={comp.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                onError={(e) => {
                  // Fallback for broken images
                  (e.target as HTMLImageElement).src =
                    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='100' height='100'%3E%3Crect fill='%23333' width='100' height='100'/%3E%3Ctext fill='%23999' x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle'%3ENo Image%3C/text%3E%3C/svg%3E";
                }}
              />
              <div className="absolute top-2 right-2 bg-black/60 backdrop-blur-sm px-2 py-1 rounded text-xs text-white/90 flex items-center gap-1">
                <ExternalLink className="w-3 h-3" />
                <span className="capitalize">{comp.source}</span>
              </div>
            </div>

            {/* Title */}
            <div className="text-sm text-[#f5f0e8] font-medium line-clamp-2 mb-2 leading-snug">
              {comp.title}
            </div>

            {/* Price & Date */}
            <div className="flex justify-between items-center text-xs">
              <span className="text-amber-400 font-bold text-base">
                ${comp.price}
              </span>
              <span className="text-[#706557]">
                {formatDistanceToNow(new Date(comp.soldDate), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </motion.a>
        ))}
      </div>

      {/* Market Comparison */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="p-4 bg-gradient-to-br from-amber-400/[0.08] to-amber-500/[0.04] border border-amber-400/20 rounded-lg"
      >
        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-4 mb-3">
          <div>
            <div className="text-xs text-[#a89d8a] mb-1">Market Average</div>
            <div className="text-[#f5f0e8] font-semibold text-lg">
              ${averagePrice}
            </div>
          </div>
          <div>
            <div className="text-xs text-[#a89d8a] mb-1">Jake&apos;s Offer</div>
            <div className="text-amber-400 font-bold text-lg">${userOffer}</div>
          </div>
        </div>

        {/* Offer vs Market Bar */}
        <div className="mb-3">
          <div className="flex justify-between items-center text-xs text-[#706557] mb-1">
            <span>Your offer is {offerVsMarket}% of market average</span>
          </div>
          <div className="w-full h-2 bg-white/[0.08] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full"
              style={{ width: `${offerVsMarket}%` }}
            />
          </div>
        </div>

        {/* Jake's Market Context Note */}
        {isBelowMarket ? (
          <p className="text-xs text-[#a89d8a] italic leading-relaxed">
            &ldquo;Market&apos;s been slow lately, partner. This is what I can
            do today, but I&apos;m bein&apos; square with ya.&rdquo;
          </p>
        ) : (
          <p className="text-xs text-[#a89d8a] italic leading-relaxed">
            &ldquo;That&apos;s a solid offer based on what I&apos;m seein&apos;
            out there. Fair and square.&rdquo;
          </p>
        )}
      </motion.div>
    </div>
  );
}
