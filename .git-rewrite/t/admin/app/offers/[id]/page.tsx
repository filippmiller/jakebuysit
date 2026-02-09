'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { OfferDetail } from '@/components/offer-detail';
import { fetchOfferById } from '@/lib/admin-api';
import type { OfferData } from '@/types/offer';

export default function OfferDetailPage() {
  const params = useParams();
  const [offer, setOffer] = useState<OfferData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadOffer() {
      try {
        const data = await fetchOfferById(params.id as string);
        setOffer(data);
      } catch (error) {
        console.error('Failed to load offer:', error);
      } finally {
        setLoading(false);
      }
    }

    loadOffer();
  }, [params.id]);

  if (loading) {
    return <div>Loading offer details...</div>;
  }

  if (!offer) {
    return <div>Offer not found</div>;
  }

  return <OfferDetail offer={offer} />;
}
