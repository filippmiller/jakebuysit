"use client";

import { useState, useEffect } from "react";
import { Camera, Upload, X, Check } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { compressImage, fileToBase64, getMediaType } from "@/lib/utils";
import { jakeVoice } from "@/lib/jake-scripts";

export interface PhotoData {
  data: string; // base64 string (without data URI prefix)
  mediaType: string; // e.g., "image/jpeg"
  type: "base64";
}

interface CameraCaptureProps {
  onPhotosCapture: (photos: PhotoData[]) => void;
  maxPhotos?: number;
  className?: string;
}

export function CameraCapture({
  onPhotosCapture,
  maxPhotos = 6,
  className = "",
}: CameraCaptureProps) {
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [mode, setMode] = useState<"camera" | "upload">("camera");
  const { isActive, error, startCamera, stopCamera, capturePhoto } =
    useCamera();

  useEffect(() => {
    return () => {
      stopCamera();
      // Cleanup previews
      previews.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const handleCameraCapture = async () => {
    const photo = await capturePhoto();
    if (!photo) return;

    const compressed = await compressImage(photo, 500);
    const newPhotos = [...photos, compressed];
    setPhotos(newPhotos);

    // Create preview
    const preview = URL.createObjectURL(compressed);
    setPreviews([...previews, preview]);

    if (newPhotos.length >= maxPhotos) {
      stopCamera();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const compressed = await Promise.all(
      files.map((file) => compressImage(file, 500))
    );

    const newPhotos = [...photos, ...compressed].slice(0, maxPhotos);
    setPhotos(newPhotos);

    // Create previews
    const newPreviews = compressed.map((file) => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews].slice(0, maxPhotos));
  };

  const removePhoto = (index: number) => {
    const newPhotos = photos.filter((_, i) => i !== index);
    setPhotos(newPhotos);

    URL.revokeObjectURL(previews[index]);
    const newPreviews = previews.filter((_, i) => i !== index);
    setPreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (photos.length > 0) {
      try {
        // Convert all photos to base64 format
        const photoDataList: PhotoData[] = await Promise.all(
          photos.map(async (file) => {
            const base64 = await fileToBase64(file);
            const mediaType = getMediaType(file);
            return {
              data: base64,
              mediaType,
              type: "base64" as const,
            };
          })
        );
        onPhotosCapture(photoDataList);
      } catch (error) {
        console.error("Failed to convert photos to base64:", error);
        // Fallback: still notify parent but with empty array
        // This ensures UI doesn't hang
      }
    }
  };

  return (
    <div className={`camera-capture ${className}`}>
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("camera")}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all border ${
            mode === "camera"
              ? "bg-white/[0.12] border-white/[0.2] text-amber-400"
              : "bg-white/[0.04] border-white/[0.08] text-[#a89d8a] hover:bg-white/[0.07] hover:text-[#f5f0e8]"
          }`}
        >
          <Camera className="w-5 h-5 inline mr-2" />
          Camera
        </button>
        <button
          onClick={() => setMode("upload")}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-all border ${
            mode === "upload"
              ? "bg-white/[0.12] border-white/[0.2] text-amber-400"
              : "bg-white/[0.04] border-white/[0.08] text-[#a89d8a] hover:bg-white/[0.07] hover:text-[#f5f0e8]"
          }`}
        >
          <Upload className="w-5 h-5 inline mr-2" />
          Upload
        </button>
      </div>

      {/* Jake's Guidance */}
      <div className="bg-white/[0.05] border-l-4 border-amber-500 p-4 mb-4 rounded-lg backdrop-blur-sm">
        <p className="text-[#c3bbad]">
          {photos.length === 0
            ? jakeVoice.camera.guidance
            : jakeVoice.camera.multiplePhotos}
        </p>
        <p className="text-sm text-[#706557] mt-1">
          {photos.length} / {maxPhotos} photos
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 border-l-4 border-l-red-500 p-4 mb-4 rounded-lg backdrop-blur-sm">
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Camera View */}
      {mode === "camera" && (
        <div className="mb-4">
          {!isActive && photos.length < maxPhotos && (
            <button
              onClick={startCamera}
              className="w-full py-16 bg-white/[0.04] hover:bg-white/[0.07] rounded-lg border-2 border-dashed border-amber-500/30 hover:border-amber-500/50 transition-all"
            >
              <Camera className="w-12 h-12 mx-auto mb-2 text-[#706557]" />
              <p className="text-[#a89d8a] font-medium">Start Camera</p>
            </button>
          )}

          {isActive && (
            <div className="relative">
              <video
                autoPlay
                playsInline
                className="w-full rounded-lg border border-white/[0.1]"
                ref={(video) => {
                  if (video && isActive) {
                    navigator.mediaDevices
                      .getUserMedia({ video: { facingMode: "environment" } })
                      .then((stream) => {
                        video.srcObject = stream;
                      });
                  }
                }}
              />
              <button
                onClick={handleCameraCapture}
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white/[0.15] backdrop-blur-sm rounded-full shadow-[0_4px_16px_rgba(0,0,0,0.3)] hover:scale-110 transition-transform flex items-center justify-center border border-white/[0.2]"
                disabled={photos.length >= maxPhotos}
              >
                <div className="w-14 h-14 border-4 border-amber-400 rounded-full" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload View */}
      {mode === "upload" && photos.length < maxPhotos && (
        <label className="block mb-4 cursor-pointer">
          <div className="py-16 bg-white/[0.04] hover:bg-white/[0.07] rounded-lg border-2 border-dashed border-amber-500/30 hover:border-amber-500/50 transition-all text-center">
            <Upload className="w-12 h-12 mx-auto mb-2 text-[#706557]" />
            <p className="text-[#a89d8a] font-medium">
              Click to upload or drag photos here
            </p>
            <p className="text-sm text-[#706557] mt-1">
              Up to {maxPhotos - photos.length} more photos
            </p>
          </div>
          <input
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileUpload}
            className="hidden"
          />
        </label>
      )}

      {/* Photo Previews */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          {previews.map((preview, index) => (
            <div key={index} className="relative group">
              <img
                src={preview}
                alt={`Photo ${index + 1}`}
                className="w-full h-32 object-cover rounded-lg border border-white/[0.1]"
              />
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500/80 backdrop-blur-sm text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center border border-red-400/30"
                aria-label="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/60 backdrop-blur-sm text-[#f5f0e8] text-xs px-2 py-1 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit Button */}
      {photos.length > 0 && (
        <button
          onClick={handleSubmit}
          className="w-full py-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-[#1a1510] font-semibold rounded-lg transition-all shadow-[0_4px_16px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_24px_rgba(245,158,11,0.3)] flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Show Jake ({photos.length} photo{photos.length > 1 ? "s" : ""})
        </button>
      )}
    </div>
  );
}
