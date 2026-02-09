"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { CameraCapture } from "@/components/CameraCapture";
import { jakeVoice } from "@/lib/jake-scripts";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const MAX_DESCRIPTION_LENGTH = 1000;
const MAX_PHOTO_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

function uploadWithProgress(
  url: string,
  formData: FormData,
  onProgress: (pct: number) => void
): Promise<{ photoUrls: string[] }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    });
    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText));
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else {
        let message = "Upload failed";
        try {
          const body = JSON.parse(xhr.responseText);
          message = body.error || message;
        } catch {
          // keep default message
        }
        reject(new Error(message));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("Network error")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));
    xhr.open("POST", url);
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("accessToken")
        : null;
    if (token) xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  });
}

function getAuthHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  const token = localStorage.getItem("accessToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function SubmitPage() {
  const router = useRouter();
  const [photos, setPhotos] = useState<File[]>([]);
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const objectUrlsRef = useRef<string[]>([]);

  // Upload progress state
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadPhase, setUploadPhase] = useState<
    "idle" | "uploading" | "creating" | "done"
  >("idle");

  // Validation state
  const [hasInteracted, setHasInteracted] = useState(false);

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
    setHasInteracted(true);
  };

  // Compute validation warnings
  const oversizedPhotos = photos.filter(
    (photo) => photo.size > MAX_PHOTO_SIZE_BYTES
  );
  const descriptionOverLimit = description.length > MAX_DESCRIPTION_LENGTH;
  const canSubmit =
    photos.length > 0 && !descriptionOverLimit && !isSubmitting;

  const handleSubmit = async () => {
    if (photos.length === 0) {
      setError("Please capture at least one photo, partner.");
      return;
    }

    if (descriptionOverLimit) {
      setError("Your description is too long. Keep it under 1,000 characters.");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setUploadProgress(0);
    setUploadPhase("uploading");

    try {
      // Step 1: Upload photos with progress tracking
      const formData = new FormData();
      photos.forEach((photo, index) => {
        formData.append(`photo_${index}`, photo);
      });

      const { photoUrls } = await uploadWithProgress(
        `${API_BASE_URL}/api/v1/uploads/photos`,
        formData,
        (pct) => setUploadProgress(pct)
      );

      // Step 2: Create offer with uploaded photo URLs
      setUploadPhase("creating");

      const offerResponse = await fetch(`${API_BASE_URL}/api/v1/offers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          photoUrls,
          userDescription: description || undefined,
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

      // Navigate to offer page to see Jake research
      router.push(`/offers/${response.offerId}`);
    } catch (err) {
      setError(jakeVoice.errors.generic);
      setUploadPhase("idle");
      setUploadProgress(0);
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
            <div>
              <CameraCapture onPhotosCapture={handlePhotosCapture} />
              {/* Photo validation hint after user has interacted */}
              {hasInteracted && photos.length === 0 && (
                <p className="text-center text-sm text-amber-400 mt-3">
                  Jake needs at least one photo, partner
                </p>
              )}
            </div>
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

                {/* File size warnings */}
                {oversizedPhotos.length > 0 && (
                  <div className="mt-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                    <p className="text-xs text-amber-400">
                      {oversizedPhotos.length === 1
                        ? "1 photo is over 10MB"
                        : `${oversizedPhotos.length} photos are over 10MB`}{" "}
                      -- upload may be slow on poor connections.
                    </p>
                  </div>
                )}

                <button
                  onClick={() => {
                    setPhotos([]);
                    setUploadPhase("idle");
                    setUploadProgress(0);
                  }}
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
                  className={`w-full px-4 py-3 bg-white/[0.05] border rounded-lg text-[#f5f0e8] placeholder-[#706557] focus:outline-none focus:ring-1 resize-none transition-colors ${
                    descriptionOverLimit
                      ? "border-red-500/50 focus:border-red-500/50 focus:ring-red-500/30"
                      : "border-white/[0.1] focus:border-amber-500/50 focus:ring-amber-500/30"
                  }`}
                  rows={3}
                  maxLength={1100} // Allow slight overtype so the counter is visible
                />
                {/* Character counter */}
                <div className="flex justify-end mt-1">
                  {description.length > 900 && (
                    <span
                      className={`text-xs ${
                        descriptionOverLimit
                          ? "text-red-400"
                          : "text-amber-400"
                      }`}
                    >
                      {description.length}/{MAX_DESCRIPTION_LENGTH}
                    </span>
                  )}
                </div>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 border-l-4 border-l-red-500 rounded-lg backdrop-blur-sm">
                  <p className="text-red-300">{error}</p>
                </div>
              )}

              {/* Upload Progress */}
              {uploadPhase !== "idle" && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm text-[#a89d8a] mb-1">
                    <span>
                      {uploadPhase === "uploading"
                        ? "Uploadin' photos..."
                        : uploadPhase === "creating"
                          ? "Jake's grabbin' your photos..."
                          : "All set!"}
                    </span>
                    <span>
                      {uploadPhase === "uploading"
                        ? `${uploadProgress}%`
                        : "..."}
                    </span>
                  </div>
                  <div className="h-2 bg-white/[0.1] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-amber-500 to-amber-400 rounded-full transition-all duration-300"
                      style={{
                        width: `${uploadPhase === "uploading" ? uploadProgress : 100}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
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
