"use client";

import { useState } from "react";
import { CameraCapture, PhotoData } from "../CameraCapture";
import { SubmissionData } from "../SubmitWizard";
import { jakeVoice } from "@/lib/jake-scripts";

interface PhotoStepProps {
  data: SubmissionData;
  onNext: (data: Partial<SubmissionData>) => void;
  onBack: () => void;
  currentStep: number;
}

export function PhotoStep({ data, onNext }: PhotoStepProps) {
  const [photos, setPhotos] = useState<PhotoData[]>(data.photos || []);
  const [error, setError] = useState<string | null>(null);

  const handlePhotosCapture = (capturedPhotos: PhotoData[]) => {
    setPhotos(capturedPhotos);
    setError(null);
  };

  const handleContinue = () => {
    if (photos.length < 3) {
      setError("Jake needs at least 3 photos to get a good look at your item, partner.");
      return;
    }

    if (photos.length > 5) {
      setError("Whoa there! 5 photos is plenty. Let's keep it simple.");
      return;
    }

    onNext({ photos });
  };

  const progress = Math.min((photos.length / 3) * 100, 100);
  const isMinimumMet = photos.length >= 3;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#f5f0e8] mb-2">
          Show{" "}
          <span className="bg-gradient-to-r from-amber-400 to-amber-500 bg-clip-text text-transparent">
            Jake
          </span>{" "}
          What You Got
        </h1>
        <p className="text-lg sm:text-xl text-[#a89d8a]">
          Snap 3 to 5 photos from different angles
        </p>
      </div>

      {/* Jake's Guidance */}
      <div className="bg-white/[0.05] border-l-4 border-amber-500 p-4 mb-6 rounded-lg backdrop-blur-sm">
        <p className="text-[#c3bbad] text-sm sm:text-base">
          {photos.length === 0
            ? jakeVoice.camera.guidance || "Get the whole thing in frame, partner. Clear photos help me make a fair offer."
            : photos.length < 3
              ? `Good start! ${3 - photos.length} more photo${3 - photos.length === 1 ? "" : "s"} and we're set.`
              : photos.length === 3
                ? "Perfect! That'll do, or add up to 2 more if you want."
                : "Lookin' good! That's plenty for me to work with."}
        </p>

        {/* Photo Progress Bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-[#706557] mb-1">
            <span>{photos.length} of 3-5 photos</span>
            <span>{isMinimumMet ? "✓ Ready" : "Need more"}</span>
          </div>
          <div className="h-1.5 bg-white/[0.1] rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isMinimumMet
                  ? "bg-gradient-to-r from-green-500 to-green-400"
                  : "bg-gradient-to-r from-amber-500 to-amber-400"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Camera Capture */}
      <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-4 sm:p-6 mb-6">
        <CameraCapture
          onPhotosCapture={handlePhotosCapture}
          maxPhotos={5}
        />
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 border-l-4 border-l-red-500 rounded-lg backdrop-blur-sm">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {/* Continue Button */}
      <button
        onClick={handleContinue}
        disabled={photos.length < 3 || photos.length > 5}
        className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-[#1a1510] font-semibold rounded-lg transition-all shadow-[0_4px_16px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_24px_rgba(245,158,11,0.3)] text-base sm:text-lg"
      >
        {photos.length < 3
          ? `Need ${3 - photos.length} More Photo${3 - photos.length === 1 ? "" : "s"}`
          : "Continue to Details →"}
      </button>

      {/* Tips */}
      <div className="mt-6 p-4 bg-white/[0.03] border border-white/[0.08] rounded-lg">
        <h3 className="text-sm font-semibold text-[#c3bbad] mb-2">
          📸 Photo Tips for Best Offer:
        </h3>
        <ul className="text-xs text-[#706557] space-y-1">
          <li>• Get the whole item in frame</li>
          <li>• Show brand labels, model numbers, or serial numbers</li>
          <li>• Include any visible damage or wear</li>
          <li>• Use good lighting (natural light works best)</li>
          <li>• Multiple angles help me see condition</li>
        </ul>
      </div>
    </div>
  );
}
