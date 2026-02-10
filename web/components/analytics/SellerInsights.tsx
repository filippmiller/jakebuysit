"use client";

import { TrendingUp, TrendingDown, Clock, DollarSign, Target } from "lucide-react";

interface SellerInsightsProps {
  insights: {
    bestDay?: string;
    acceptanceRate?: number;
    avgOffer?: number;
    categoryTrend?: 'up' | 'down' | 'stable';
    trendPercentage?: number;
    optimalTime?: string;
  };
  userCategory?: string;
}

export function SellerInsights({ insights, userCategory = "Electronics" }: SellerInsightsProps) {
  const {
    bestDay = "Tuesday",
    acceptanceRate = 0,
    avgOffer = 0,
    categoryTrend = 'stable',
    trendPercentage = 0,
    optimalTime = "2-4 PM"
  } = insights;

  const getTrendColor = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return 'text-emerald-400';
    if (trend === 'down') return 'text-red-400';
    return 'text-amber-400';
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    if (trend === 'up') return <TrendingUp className="w-4 h-4" />;
    if (trend === 'down') return <TrendingDown className="w-4 h-4" />;
    return <Target className="w-4 h-4" />;
  };

  return (
    <div className="bg-gradient-to-br from-amber-500/[0.08] to-amber-600/[0.04] border border-amber-500/[0.15] rounded-xl p-6">
      <h3 className="text-lg font-semibold text-[#f5f0e8] mb-4 flex items-center gap-2">
        <TrendingUp className="w-5 h-5 text-amber-400" />
        Market Insights for You
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Best Day to Sell */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-[#706557] mb-2">
            <Clock className="w-4 h-4" />
            Best Day to Sell
          </div>
          <p className="text-2xl font-bold text-emerald-400">{bestDay}</p>
          <p className="text-xs text-[#706557] mt-1">
            {userCategory} items sell best on {bestDay}s
          </p>
        </div>

        {/* Acceptance Rate */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-[#706557] mb-2">
            <Target className="w-4 h-4" />
            Category Success Rate
          </div>
          <p className="text-2xl font-bold text-amber-400">{acceptanceRate.toFixed(0)}%</p>
          <p className="text-xs text-[#706557] mt-1">
            of {userCategory} offers are accepted
          </p>
        </div>

        {/* Price Trend */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-[#706557] mb-2">
            <DollarSign className="w-4 h-4" />
            Price Trend
          </div>
          <div className={`flex items-center gap-2 ${getTrendColor(categoryTrend)}`}>
            {getTrendIcon(categoryTrend)}
            <span className="text-2xl font-bold">
              {categoryTrend === 'up' ? '+' : categoryTrend === 'down' ? '-' : ''}
              {Math.abs(trendPercentage).toFixed(0)}%
            </span>
          </div>
          <p className="text-xs text-[#706557] mt-1">
            {categoryTrend === 'up' ? 'Prices trending up!' : categoryTrend === 'down' ? 'Prices trending down' : 'Prices stable'}
          </p>
        </div>

        {/* Optimal Time */}
        <div className="bg-white/[0.04] border border-white/[0.08] rounded-lg p-4">
          <div className="flex items-center gap-2 text-xs text-[#706557] mb-2">
            <Clock className="w-4 h-4" />
            Best Time
          </div>
          <p className="text-2xl font-bold text-blue-400">{optimalTime}</p>
          <p className="text-xs text-[#706557] mt-1">
            Highest acceptance during this window
          </p>
        </div>
      </div>

      {/* Recommendation */}
      <div className="mt-4 p-4 bg-amber-500/[0.1] border border-amber-500/[0.2] rounded-lg">
        <p className="text-sm text-[#f5f0e8]">
          <span className="font-semibold text-amber-400">💡 Pro Tip:</span>{" "}
          {categoryTrend === 'up'
            ? `${userCategory} prices are trending up ${trendPercentage.toFixed(0)}%! Now might be a great time to sell.`
            : categoryTrend === 'down'
            ? `${userCategory} prices are trending down ${Math.abs(trendPercentage).toFixed(0)}%. Consider selling soon to get better offers.`
            : `${userCategory} prices are stable. Submit your items on ${bestDay} between ${optimalTime} for best results!`}
        </p>
      </div>
    </div>
  );
}
