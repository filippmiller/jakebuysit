'use client';

import { useEffect, useState } from 'react';
import { fetchDashboardFeed } from '@/lib/admin-api';
import type { OfferFeedItem } from '@/types/dashboard';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

const statusColors = {
  processing: 'bg-blue-100 text-blue-800',
  ready: 'bg-green-100 text-green-800',
  accepted: 'bg-green-100 text-green-800',
  escalated: 'bg-yellow-100 text-yellow-800',
  rejected: 'bg-gray-100 text-gray-800',
  fraud: 'bg-red-100 text-red-800',
};

export function LiveFeed() {
  const [offers, setOffers] = useState<OfferFeedItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadFeed() {
      try {
        const data = await fetchDashboardFeed(20);
        setOffers(data);
      } catch (error) {
        console.error('Failed to load feed:', error);
      } finally {
        setLoading(false);
      }
    }

    loadFeed();

    // Auto-refresh every 5 seconds
    const interval = setInterval(loadFeed, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold">Live Feed</h2>
        <p className="mt-2 text-muted-foreground">Loading recent offers...</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-card">
      <div className="border-b p-4">
        <h2 className="text-lg font-semibold">Live Feed</h2>
        <p className="text-sm text-muted-foreground">Recent offers (auto-refresh every 5s)</p>
      </div>

      <div className="max-h-[500px] overflow-auto">
        {offers.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No recent offers</div>
        ) : (
          <ul className="divide-y">
            {offers.map((offer) => (
              <li
                key={offer.id}
                className="flex items-center gap-4 p-4 hover:bg-accent/50 cursor-pointer transition-colors"
              >
                {offer.thumbnail && (
                  <img
                    src={offer.thumbnail}
                    alt={offer.model}
                    className="h-12 w-12 rounded object-cover"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">
                    {offer.brand} {offer.model}
                  </p>
                  <p className="text-sm text-muted-foreground truncate">
                    {offer.userEmail} • {offer.category}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">${offer.offerAmount}</p>
                  <p className="text-xs text-muted-foreground">
                    {offer.confidence}% conf
                  </p>
                </div>
                <span
                  className={cn(
                    'status-badge',
                    statusColors[offer.status]
                  )}
                >
                  {offer.status}
                </span>
                <p className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(offer.createdAt), { addSuffix: true })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
