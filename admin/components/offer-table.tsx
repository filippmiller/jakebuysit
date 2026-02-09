'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { adminAPI } from '@/lib/admin-api';
import { OfferData, OfferFilters } from '@/types/offer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatCurrency, truncateUUID, copyToClipboard } from '@/lib/utils';
import { Copy, ExternalLink, Play } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface OfferTableProps {
  filters: OfferFilters;
}

const statusVariants: Record<string, any> = {
  processing: 'default',
  ready: 'success',
  accepted: 'success',
  escalated: 'warning',
  rejected: 'outline',
  fraud: 'error',
};

const confidenceColor = (conf: number) => {
  if (conf >= 80) return 'text-green-600';
  if (conf >= 60) return 'text-yellow-600';
  return 'text-red-600';
};

export function OfferTable({ filters }: OfferTableProps) {
  const [offers, setOffers] = useState<OfferData[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    async function loadOffers() {
      try {
        setLoading(true);
        const data = await adminAPI.getOffers(filters, page);
        setOffers(data.offers);
        setTotal(data.total);
      } catch (error) {
        console.error('Failed to load offers:', error);
      } finally {
        setLoading(false);
      }
    }

    loadOffers();
  }, [filters, page]);

  const handleCopyId = (id: string) => {
    copyToClipboard(id);
  };

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-12 text-center">
        <p className="text-muted-foreground">Loading offers...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="p-3 text-left text-sm font-medium">ID</th>
                <th className="p-3 text-left text-sm font-medium">Photo</th>
                <th className="p-3 text-left text-sm font-medium">User</th>
                <th className="p-3 text-left text-sm font-medium">Item</th>
                <th className="p-3 text-left text-sm font-medium">Condition</th>
                <th className="p-3 text-left text-sm font-medium">AI Conf</th>
                <th className="p-3 text-right text-sm font-medium">FMV</th>
                <th className="p-3 text-right text-sm font-medium">Offer</th>
                <th className="p-3 text-right text-sm font-medium">Margin</th>
                <th className="p-3 text-left text-sm font-medium">Status</th>
                <th className="p-3 text-left text-sm font-medium">Jake</th>
                <th className="p-3 text-left text-sm font-medium">Created</th>
                <th className="p-3 text-right text-sm font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {offers.length === 0 ? (
                <tr>
                  <td colSpan={13} className="p-12 text-center text-muted-foreground">
                    No offers found matching the current filters
                  </td>
                </tr>
              ) : (
                offers.map((offer) => (
                  <tr key={offer.id} className="hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <button
                        onClick={() => handleCopyId(offer.id)}
                        className="flex items-center gap-1 text-xs font-mono text-muted-foreground hover:text-foreground"
                        title="Click to copy full ID"
                      >
                        {truncateUUID(offer.id)}
                        <Copy className="h-3 w-3" />
                      </button>
                    </td>
                    <td className="p-3">
                      {offer.photos[0] && (
                        <img
                          src={offer.photos[0]}
                          alt={offer.identification.model}
                          className="h-12 w-12 rounded object-cover"
                        />
                      )}
                    </td>
                    <td className="p-3">
                      <Link
                        href={`/users/${offer.userId}`}
                        className="text-sm hover:underline"
                      >
                        {offer.userEmail}
                      </Link>
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="text-sm font-medium">
                          {offer.identification.brand} {offer.identification.model}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {offer.identification.category}
                        </p>
                      </div>
                    </td>
                    <td className="p-3">
                      <span className="text-sm">{offer.identification.condition}</span>
                    </td>
                    <td className="p-3">
                      <span className={`text-sm font-semibold ${confidenceColor(offer.identification.confidence)}`}>
                        {offer.identification.confidence}%
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-sm">{formatCurrency(offer.pricing.fmv)}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-sm font-semibold">{formatCurrency(offer.pricing.finalOffer)}</span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="text-sm">{(offer.pricing.offerToMarketRatio * 100).toFixed(0)}%</span>
                    </td>
                    <td className="p-3">
                      <Badge variant={statusVariants[offer.status]}>
                        {offer.status}
                      </Badge>
                    </td>
                    <td className="p-3">
                      {offer.jake.audioUrl && (
                        <button
                          className="flex items-center gap-1 text-sm text-primary hover:underline"
                          title="Play Jake voice"
                        >
                          <Play className="h-3 w-3" />
                          T{offer.jake.tier}
                        </button>
                      )}
                    </td>
                    <td className="p-3">
                      <span className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(offer.createdAt), { addSuffix: true })}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <Link href={`/offers/${offer.id}`}>
                        <Button size="sm" variant="ghost">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {total > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {offers.length} of {total} offers
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setPage(p => p + 1)}
              disabled={offers.length < 20}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
