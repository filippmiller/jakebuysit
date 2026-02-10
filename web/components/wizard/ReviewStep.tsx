"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { SubmissionData } from "../SubmitWizard";
import { jakeVoice } from "@/lib/jake-scripts";

interface ReviewStepProps {
  data: SubmissionData;
  onNext: (data: Partial<SubmissionData>) => void;
  onBack: () => void;
  currentStep: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export function ReviewStep({ data, onBack }: ReviewStepProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploadPhase, setUploadPhase] = useState<
    "idle" | "creating" | "done"
  >("idle");

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);
    setUploadPhase("creating");

    try {
      // Create offer with base64 photo data and all details
      const offerResponse = await fetch(`${API_BASE_URL}/api/v1/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          photos: data.photos,
          userDescription: data.description,
          category: data.category,
          condition: data.condition,
          contactName: data.name,
          contactEmail: data.email,
          contactPhone: data.phone,
          shippingAddress: data.address,
        }),
      });

      if (!offerResponse.ok) {
        const err = await offerResponse
          .json()
          .catch(() => ({ error: "Offer creation failed" }));
        throw new Error(err.error || "Failed to create offer");
      }

      const response = await offerResponse.json();

      setUploadPhase("done");

      // Navigate to offer page to see Jake's evaluation
      router.push(`/offers/${response.offerId}`);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : jakeVoice.errors.generic
      );
      setUploadPhase("idle");
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#f5f0e8] mb-2">
          Ready to See Jake's Offer?
        </h1>
        <p className="text-lg sm:text-xl text-[#a89d8a]">
          Double-check everything looks right
        </p>
      </div>

      {/* Review Card */}
      <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-4 sm:p-6 space-y-6 mb-6">
        {/* Photos Preview */}
        <div>
          <h3 className="text-sm font-semibold text-[#c3bbad] mb-3">
            Photos ({data.photos.length})
          </h3>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
            {data.photos.map((photo, index) => (
              <div key={index} className="relative group">
                <img
                  src={`data:${photo.mediaType};base64,${photo.data}`}
                  alt={`Photo ${index + 1}`}
                  className="w-full h-20 object-cover rounded-lg border border-white/[0.1]"
                />
                <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm text-[#f5f0e8] text-xs px-2 py-0.5 rounded">
                  {index + 1}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Details */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-[#706557] mb-1">Category</p>
            <p className="text-[#f5f0e8] font-medium">{data.category}</p>
          </div>
          <div>
            <p className="text-xs text-[#706557] mb-1">Condition</p>
            <p className="text-[#f5f0e8] font-medium capitalize">
              {data.condition}
            </p>
          </div>
        </div>

        <div>
          <p className="text-xs text-[#706557] mb-1">Description</p>
          <p className="text-[#f5f0e8] text-sm leading-relaxed">
            {data.description}
          </p>
        </div>

        {/* Contact Info */}
        <div className="pt-4 border-t border-white/[0.1]">
          <h3 className="text-sm font-semibold text-[#c3bbad] mb-3">
            Contact Info
          </h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-xs text-[#706557]">Name:</span>
              <span className="text-sm text-[#f5f0e8]">{data.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[#706557]">Email:</span>
              <span className="text-sm text-[#f5f0e8]">{data.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-[#706557]">Phone:</span>
              <span className="text-sm text-[#f5f0e8]">{data.phone}</span>
            </div>
            {data.address && (
              <div className="mt-3 pt-3 border-t border-white/[0.08]">
                <p className="text-xs text-[#706557] mb-1">Shipping Address:</p>
                <p className="text-sm text-[#f5f0e8] leading-relaxed">
                  {data.address.street}
                  <br />
                  {data.address.city}, {data.address.state} {data.address.zip}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Jake's Promise */}
      <div className="bg-white/[0.05] border-l-4 border-amber-500 p-4 mb-6 rounded-lg backdrop-blur-sm">
        <p className="text-[#c3bbad] text-sm">
          Alright partner, once you hit that button, I'll start lookin' over
          your item. Usually takes me under a minute to size it up and make you
          a fair offer.
        </p>
        <p className="text-[#706557] text-xs mt-2">
          ⏱️ Estimated time: Under 60 seconds
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 border-l-4 border-l-red-500 rounded-lg backdrop-blur-sm">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Submit Progress */}
      {uploadPhase !== "idle" && (
        <div className="mb-4">
          <div className="flex justify-between text-sm text-[#a89d8a] mb-1">
            <span>
              {uploadPhase === "creating"
                ? "Jake's evaluatin' your item..."
                : "All set!"}
            </span>
            <span>...</span>
          </div>
          <div className="h-2 bg-white/[0.1] rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300 w-full animate-pulse" />
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        <button
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 py-4 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] text-[#c3bbad] font-semibold rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ← Back to Contact
        </button>
        <button
          onClick={handleSubmit}
          disabled={isSubmitting}
          className="flex-1 sm:flex-[2] py-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-[#1a1510] font-semibold rounded-lg transition-all shadow-[0_4px_16px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_24px_rgba(245,158,11,0.3)] text-base sm:text-lg"
        >
          {isSubmitting ? "Sendin' to Jake..." : "Show Me Your Offer 🤠"}
        </button>
      </div>
    </div>
  );
}
