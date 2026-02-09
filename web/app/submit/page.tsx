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
    <main className="min-h-screen bg-gradient-to-b from-saloon-50 to-white py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-dusty-800 mb-2">
            Show Jake What You Got
          </h1>
          <p className="text-xl text-dusty-600">
            Take a few photos and let Jake make you an offer
          </p>
        </div>

        {/* Camera Capture */}
        {photos.length === 0 ? (
          <CameraCapture onPhotosCapture={handlePhotosCapture} />
        ) : (
          <div className="bg-white rounded-2xl shadow-xl p-6">
            {/* Photo Preview */}
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-dusty-800 mb-3">
                Your Photos ({photos.length})
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((photo, index) => (
                  <div key={index} className="relative">
                    <img
                      src={createPreviewUrl(photo)}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => setPhotos([])}
                className="mt-3 text-sm text-saloon-600 hover:underline"
              >
                ← Take different photos
              </button>
            </div>

            {/* Optional Description */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-dusty-800 mb-2">
                Anything else Jake should know? (Optional)
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="E.g., minor scratches on back, original box included..."
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-saloon-500 focus:outline-none resize-none"
                rows={3}
              />
            </div>

            {/* Error */}
            {error && (
              <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-500 rounded">
                <p className="text-red-700">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full py-4 bg-saloon-500 hover:bg-saloon-600 disabled:bg-gray-300 text-white font-semibold rounded-lg transition-colors"
            >
              {isSubmitting ? "Sendin' to Jake..." : "Get Jake's Offer"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
