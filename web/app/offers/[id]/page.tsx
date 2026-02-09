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
    <main className="min-h-screen bg-[#0f0d0a] relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-1/4 right-1/3 w-[500px] h-[500px] rounded-full bg-amber-900/[0.06] blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] rounded-full bg-amber-800/[0.04] blur-[100px] pointer-events-none" />

      <div className="relative z-10">
        {error && (
          <div className="max-w-2xl mx-auto p-4 pt-8">
            <div className="bg-red-500/10 border border-red-500/30 border-l-4 border-l-red-500 p-4 rounded-lg backdrop-blur-sm">
              <p className="text-red-300">{error}</p>
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
      </div>
    </main>
  );
}
