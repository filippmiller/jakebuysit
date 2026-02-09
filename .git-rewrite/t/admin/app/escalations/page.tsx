'use client';

import { useState } from 'react';
import { EscalationQueue } from '@/components/escalation-queue';
import { ReviewModal } from '@/components/review-modal';
import type { EscalatedOffer } from '@/types/escalation';

export default function EscalationsPage() {
  const [selectedEscalation, setSelectedEscalation] = useState<EscalatedOffer | null>(null);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Escalation Queue</h1>
        <p className="text-muted-foreground">
          Review and resolve escalated offers requiring human judgment
        </p>
      </div>

      <EscalationQueue onSelect={setSelectedEscalation} />

      {selectedEscalation && (
        <ReviewModal
          escalation={selectedEscalation}
          onClose={() => setSelectedEscalation(null)}
        />
      )}
    </div>
  );
}
