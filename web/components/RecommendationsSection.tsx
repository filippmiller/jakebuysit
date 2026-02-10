'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import Link from 'next/link';
import Image from 'next/image';

interface RecommendationItem {
  offer_id: string;
  score: number;
  reason: string;
  item_category?: string;
  item_brand?: string;
  item_model?: string;
  item_condition?: string;
  offer_amount?: number;
  thumbnail_url?: string;
}

interface RecommendationsSectionProps {
  offerId?: string;
  userId?: string;
  title?: string;
  type?: 'similar' | 'trending' | 'user';
  limit?: number;
  className?: string;
}

export function RecommendationsSection({
  offerId,
  userId,
  title = 'You might also like',
  type = 'trending',
  limit = 5,
  className = '',
}: RecommendationsSectionProps) {
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchRecommendations() {
      try {
        setLoading(true);
        setError(null);

        let response;

        if (type === 'similar' && offerId) {
          // Get similar items to current offer
          response = await api.get(`/api/v1/offers/${offerId}/recommendations`);
        } else if (type === 'user' && userId) {
          // Get personalized recommendations (would need new endpoint)
          response = await api.get(`/api/v1/users/${userId}/recommendations?limit=${limit}`);
        } else {
          // Get trending items
          response = await api.get(`/api/v1/offers/trending?limit=${limit}`);
        }

        if (response.ok) {
          const data = await response.json();
          setRecommendations(data.recommendations || []);
        } else {
          throw new Error('Failed to fetch recommendations');
        }
      } catch (err: any) {
        console.error('Recommendations error:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchRecommendations();
  }, [offerId, userId, type, limit]);

  if (loading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <h2 className="text-2xl font-bold text-amber-700">{title}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-amber-100/50 rounded-lg aspect-square mb-2" />
              <div className="h-4 bg-amber-100/50 rounded mb-2" />
              <div className="h-4 bg-amber-100/50 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error || recommendations.length === 0) {
    return null; // Don't show section if there's an error or no recommendations
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <h2 className="text-2xl font-bold text-amber-700">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        {recommendations.map((rec) => (
          <Link
            key={rec.offer_id}
            href={`/offers/${rec.offer_id}`}
            className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-all duration-200 overflow-hidden"
          >
            {/* Thumbnail */}
            <div className="relative aspect-square bg-amber-50">
              {rec.thumbnail_url ? (
                <Image
                  src={rec.thumbnail_url}
                  alt={`${rec.item_brand} ${rec.item_model}`}
                  fill
                  className="object-cover group-hover:scale-105 transition-transform duration-200"
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-amber-300">
                  <svg
                    className="w-16 h-16"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                </div>
              )}

              {/* Badge for recommendation reason */}
              <div className="absolute top-2 right-2 bg-amber-500 text-white text-xs px-2 py-1 rounded-full shadow">
                {Math.round(rec.score * 100)}% match
              </div>
            </div>

            {/* Info */}
            <div className="p-3 space-y-1">
              <h3 className="font-semibold text-gray-900 truncate">
                {rec.item_brand} {rec.item_model}
              </h3>

              <p className="text-sm text-gray-600 truncate">
                {rec.item_condition} • {rec.item_category}
              </p>

              {rec.offer_amount && (
                <p className="text-lg font-bold text-green-600">
                  ${rec.offer_amount.toFixed(2)}
                </p>
              )}

              <p className="text-xs text-amber-600 truncate" title={rec.reason}>
                {rec.reason}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
