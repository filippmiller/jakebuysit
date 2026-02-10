'use client';

import React from 'react';
import { Shield, Star, Sparkles } from 'lucide-react';

export type LoyaltyTier = 'prospector' | 'wrangler' | 'sheriff';

interface TierBadgeProps {
  tier: LoyaltyTier;
  earnMultiplier?: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  className?: string;
}

const tierConfig: Record<LoyaltyTier, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
}> = {
  prospector: {
    label: 'Prospector',
    color: '#CD7F32',
    bgColor: 'bg-amber-900/20',
    borderColor: 'border-amber-700',
    icon: Sparkles,
    description: 'Getting started on the frontier',
  },
  wrangler: {
    label: 'Wrangler',
    color: '#C0C0C0',
    bgColor: 'bg-slate-700/30',
    borderColor: 'border-slate-400',
    icon: Shield,
    description: 'Regular at Jake\'s trading post',
  },
  sheriff: {
    label: 'Sheriff',
    color: '#FFD700',
    bgColor: 'bg-yellow-500/20',
    borderColor: 'border-yellow-500',
    icon: Star,
    description: 'Top trader in the territory',
  },
};

export function TierBadge({
  tier,
  earnMultiplier,
  size = 'md',
  showLabel = true,
  className = '',
}: TierBadgeProps) {
  const config = tierConfig[tier];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'h-5 w-5',
    md: 'h-6 w-6',
    lg: 'h-8 w-8',
  };

  const textSizeClasses = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border-2 ${config.bgColor} ${config.borderColor} ${className}`}
      style={{ borderColor: config.color }}
    >
      <Icon
        className={`${sizeClasses[size]}`}
        style={{ color: config.color }}
      />
      {showLabel && (
        <div className="flex items-center gap-1.5">
          <span className={`font-semibold ${textSizeClasses[size]}`} style={{ color: config.color }}>
            {config.label}
          </span>
          {earnMultiplier && (
            <span className={`${textSizeClasses[size]} text-gray-400`}>
              ({earnMultiplier}x)
            </span>
          )}
        </div>
      )}
    </div>
  );
}

interface TierProgressBarProps {
  currentTier: LoyaltyTier;
  itemsSold: number;
  salesValue: number;
  progressPercentage: number;
  itemsToNextTier?: number | null;
  salesValueToNextTier?: number | null;
  nextTier?: LoyaltyTier | null;
}

export function TierProgressBar({
  currentTier,
  itemsSold,
  salesValue,
  progressPercentage,
  itemsToNextTier,
  salesValueToNextTier,
  nextTier,
}: TierProgressBarProps) {
  const currentConfig = tierConfig[currentTier];
  const nextConfig = nextTier ? tierConfig[nextTier] : null;

  if (!nextTier) {
    return (
      <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg">
        <div className="flex items-center justify-between mb-2">
          <TierBadge tier={currentTier} />
          <span className="text-sm text-amber-500 font-semibold">MAX TIER</span>
        </div>
        <p className="text-sm text-gray-400 mt-2">
          You've reached the highest tier! Keep earning Jake Bucks with every sale.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-gray-900/50 border border-gray-700 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <TierBadge tier={currentTier} size="sm" />
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500">→</span>
          <TierBadge tier={nextTier} size="sm" />
        </div>
      </div>

      {/* Progress bar */}
      <div className="space-y-1">
        <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-600 to-amber-400 transition-all duration-500"
            style={{
              width: `${Math.min(100, progressPercentage)}%`,
              backgroundColor: currentConfig.color,
            }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-400">
          <span>{Math.round(progressPercentage)}% to {nextConfig?.label}</span>
        </div>
      </div>

      {/* Progress details */}
      <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-800">
        <div>
          <p className="text-xs text-gray-500">Items Sold</p>
          <p className="text-sm font-semibold text-white">
            {itemsSold}
            {itemsToNextTier !== null && itemsToNextTier > 0 && (
              <span className="text-xs text-gray-400 ml-1">
                / {itemsSold + itemsToNextTier}
              </span>
            )}
          </p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total Sales</p>
          <p className="text-sm font-semibold text-white">
            ${salesValue.toFixed(0)}
            {salesValueToNextTier !== null && salesValueToNextTier > 0 && (
              <span className="text-xs text-gray-400 ml-1">
                / ${(salesValue + salesValueToNextTier).toFixed(0)}
              </span>
            )}
          </p>
        </div>
      </div>

      {/* Next tier requirements */}
      {(itemsToNextTier !== null && itemsToNextTier > 0) || (salesValueToNextTier !== null && salesValueToNextTier > 0) ? (
        <p className="text-xs text-gray-400 pt-2 border-t border-gray-800">
          {itemsToNextTier !== null && itemsToNextTier > 0 && (
            <span>
              Sell <span className="text-amber-500 font-semibold">{itemsToNextTier} more item{itemsToNextTier !== 1 ? 's' : ''}</span>
            </span>
          )}
          {itemsToNextTier !== null && itemsToNextTier > 0 && salesValueToNextTier !== null && salesValueToNextTier > 0 && (
            <span className="text-gray-500"> or </span>
          )}
          {salesValueToNextTier !== null && salesValueToNextTier > 0 && (
            <span>
              reach <span className="text-amber-500 font-semibold">${salesValueToNextTier.toFixed(0)}</span> more in sales
            </span>
          )}
          {' '}to unlock {nextConfig?.label}!
        </p>
      ) : null}
    </div>
  );
}
