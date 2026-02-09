"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CameraCapture } from "@/components/CameraCapture";
import { apiClient } from "@/lib/api-client";
import { jakeVoice } from "@/lib/jake-scripts";

export default function SubmitPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  // Revoke object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const createPreviewUrl = (file: File): string => {
    const url = URL.createObjectURL(file);
    objectUrlsRef.current.push(url);
    return url;
  };

  const handlePhotosCapture = (capturedPhotos: File[]) => {
    // Revoke previous URLs when replacing photos
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];
    setPhotos(capturedPhotos);
  };

  const handleSubmit = async () => {
    if (photos.length === 0) {
      setError("Please capture at least one photo, partner.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await apiClient.submitOffer({
        photos,
        description: description || undefined,
      });

      // Navigate to offer page to see Jake research
      router.push(`/offers/${response.offerId}`);
    } catch (err) {
      setError(jakeVoice.errors.generic);
      console.error("Submit error:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f0d0a] relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-400/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 pt-24 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#f5f0e8] mb-2">
              Show{" "}
              <span className="bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
                Jake
              </span>{" "}
              What You Got
            </h1>
            <p className="text-xl text-[#a89d8a]">
              Take a few photos and let Jake make you an offer
            </p>
          </div>

          {/* Camera Capture */}
          {photos.length === 0 ? (
            <CameraCapture onPhotosCapture={handlePhotosCapture} />
          ) : (
            <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-6">
              {/* Photo Preview */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-[#f5f0e8] mb-3">
                  Your Photos ({photos.length})
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={createPreviewUrl(photo)}
                        alt={`Photo ${index + 1}`}
                        className="w-full h-32 object-cover rounded-lg border border-white/[0.1]"
                      />
                      <div className="absolute inset-0 bg-black/20 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-1 left-1 bg-black/60 text-[#f5f0e8] text-xs px-2 py-1 rounded">
                        {index + 1}
                      </div>
                    </div>
                  ))}
                </div>
                <button
                  onClick={() => setPhotos([])}
                  className="mt-3 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                >
                  ← Take different photos
                </button>
              </div>

              {/* Optional Description */}
              <div className="mb-6">
                <label className="block text-sm font-semibold text-[#c3bbad] mb-2">
                  Anything else Jake should know? (Optional)
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="E.g., minor scratches on back, original box included..."
                  className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] focus:border-amber-500/50 focus:outline-none focus:ring-1 focus:ring-amber-500/30 resize-none transition-colors"
                  rows={3}
                />
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 border-l-4 border-l-red-500 rounded-lg backdrop-blur-sm">
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-[#1a1510] font-semibold rounded-lg transition-all shadow-[0_4px_16px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_24px_rgba(245,158,11,0.3)]"
              >
                {isSubmitting ? "Sendin' to Jake..." : "Get Jake's Offer"}
              </button>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
