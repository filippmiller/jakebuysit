"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ResearchAnimation } from "@/components/ResearchAnimation";
import { OfferCard } from "@/components/OfferCard";
import { apiClient, OfferDetails } from "@/lib/api-client";
import { jakeVoice } from "@/lib/jake-scripts";

export default function OfferPage() {
  const params = useParams();
  const router = useRouter();
  const offerId = params.id as string;

  const [stage, setStage] = useState<"researching" | "offer">("researching");
  const [offer, setOffer] = useState<OfferDetails | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleResearchComplete = async () => {
    try {
      const offerData = await apiClient.getOffer(offerId);
      setOffer(offerData);
      setStage("offer");
    } catch (err) {
      setError(jakeVoice.errors.generic);
      console.error("Failed to fetch offer:", err);
    }
  };

  const handleAccept = () => {
    // For now, redirect to dashboard
    // TODO: Build registration flow modal
    router.push("/dashboard");
  };

  const handleDecline = () => {
    // Navigate back to home
    router.push("/");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-saloon-50 to-white">
      {error && (
        <div className="max-w-2xl mx-auto p-4">
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded">
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {stage === "researching" && (
        <ResearchAnimation
          offerId={offerId}
          onComplete={handleResearchComplete}
        />
      )}

      {stage === "offer" && offer && (
        <div className="py-12 px-4">
          <OfferCard
            offer={offer}
            onAccept={handleAccept}
            onDecline={handleDecline}
          />
        </div>
      )}
    </main>
  );
}
