'use client';

import React, { useEffect, useState } from 'react';
import { TierBadge, TierProgressBar } from '@/components/loyalty/TierBadge';
import { JakeBucksDisplay, TransactionHistory } from '@/components/loyalty/JakeBucksDisplay';
import {
  getTierProgress,
  getJakeBucksBalance,
  getRedemptionCatalog,
  redeemBucks,
  type TierProgress,
  type JakeBucksBalance,
  type RedemptionItem,
} from '@/lib/loyalty-api';
import { Coins, Gift, Loader2, AlertCircle } from 'lucide-react';

export default function LoyaltyPage() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [tierProgress, setTierProgress] = useState<TierProgress | null>(null);
  const [jakeBucksData, setJakeBucksData] = useState<JakeBucksBalance | null>(null);
  const [catalog, setCatalog] = useState<RedemptionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState<string | null>(null);

  useEffect(() => {
    // Get auth token from localStorage (assuming user is logged in)
    const token = localStorage.getItem('authToken');
    if (!token) {
      setError('You must be logged in to view your loyalty status');
      setLoading(false);
      return;
    }
    setAuthToken(token);
  }, []);

  useEffect(() => {
    if (!authToken) return;

    async function loadLoyaltyData() {
      try {
        setLoading(true);
        const [progress, bucks, redemptions] = await Promise.all([
          getTierProgress(authToken!),
          getJakeBucksBalance(authToken!),
          getRedemptionCatalog(authToken!),
        ]);

        setTierProgress(progress);
        setJakeBucksData(bucks);
        setCatalog(redemptions.items);
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    }

    loadLoyaltyData();
  }, [authToken]);

  const handleRedeem = async (redemptionId: string) => {
    if (!authToken) return;

    try {
      setRedeeming(redemptionId);
      const result = await redeemBucks(authToken, redemptionId);

      alert(result.message);

      // Reload data after redemption
      const [bucks, redemptions] = await Promise.all([
        getJakeBucksBalance(authToken),
        getRedemptionCatalog(authToken),
      ]);

      setJakeBucksData(bucks);
      setCatalog(redemptions.items);
    } catch (err) {
      alert((err as Error).message);
    } finally {
      setRedeeming(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-amber-500" />
      </div>
    );
  }

  if (error || !tierProgress || !jakeBucksData) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Oops!</h2>
          <p className="text-gray-400">{error || 'Failed to load loyalty data'}</p>
          <a
            href="/login"
            className="inline-block mt-4 px-6 py-2 bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
          >
            Log In
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Frontier Club</h1>
          <p className="text-gray-400">Your loyalty rewards with Jake</p>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Tier & Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Current Status */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Your Status</h2>
              <div className="flex items-center justify-between mb-6">
                <TierBadge
                  tier={tierProgress.tier}
                  earnMultiplier={tierProgress.earnMultiplier}
                  size="lg"
                />
                <JakeBucksDisplay balance={jakeBucksData.balance} size="lg" />
              </div>

              <TierProgressBar
                currentTier={tierProgress.tier}
                itemsSold={tierProgress.itemsSold}
                salesValue={tierProgress.salesValue}
                progressPercentage={tierProgress.progressPercentage}
                itemsToNextTier={tierProgress.itemsToNextTier}
                salesValueToNextTier={tierProgress.salesValueToNextTier}
                nextTier={tierProgress.nextTier}
              />
            </div>

            {/* Recent Transactions */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Coins className="h-5 w-5 text-amber-500" />
                Recent Transactions
              </h2>
              <TransactionHistory transactions={jakeBucksData.recentTransactions} />
            </div>
          </div>

          {/* Right Column: Redemptions */}
          <div className="space-y-6">
            <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
                <Gift className="h-5 w-5 text-amber-500" />
                Redeem Rewards
              </h2>

              <div className="space-y-3">
                {catalog.map((item) => {
                  const canAfford = jakeBucksData.balance >= item.cost;
                  const isAvailable = item.available && canAfford;

                  return (
                    <div
                      key={item.id}
                      className={`p-4 border rounded-lg ${
                        isAvailable
                          ? 'border-amber-700 bg-amber-900/10 hover:bg-amber-900/20'
                          : 'border-gray-800 bg-gray-900/30 opacity-60'
                      } transition-colors`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="font-semibold text-sm">{item.name}</h3>
                        <div className="text-amber-500 font-bold text-sm whitespace-nowrap ml-2">
                          {item.cost.toLocaleString()}
                        </div>
                      </div>

                      <p className="text-xs text-gray-400 mb-3">{item.description}</p>

                      {item.tier_requirement && (
                        <div className="mb-2">
                          <TierBadge
                            tier={item.tier_requirement}
                            size="sm"
                            showLabel={true}
                          />
                        </div>
                      )}

                      {isAvailable ? (
                        <button
                          onClick={() => handleRedeem(item.id)}
                          disabled={redeeming === item.id}
                          className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-semibold transition-colors flex items-center justify-center gap-2"
                        >
                          {redeeming === item.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Redeeming...
                            </>
                          ) : (
                            'Redeem'
                          )}
                        </button>
                      ) : (
                        <div className="text-xs text-gray-500 text-center py-2">
                          {!item.available
                            ? 'Tier requirement not met'
                            : !canAfford
                            ? `Need ${(item.cost - jakeBucksData.balance).toLocaleString()} more Bucks`
                            : 'Not available'}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Benefits */}
            <div className="bg-gray-900/50 border border-gray-700 rounded-xl p-6">
              <h3 className="font-semibold mb-3">Your Benefits</h3>
              <ul className="space-y-2 text-sm text-gray-300">
                {tierProgress.benefits.map((benefit, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-amber-500 mt-0.5">✓</span>
                    <span>{benefit}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
