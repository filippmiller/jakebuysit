"use client";

import { useState, useEffect } from "react";
import { Camera, Upload, X, Check } from "lucide-react";
import { useCamera } from "@/hooks/useCamera";
import { compressImage } from "@/lib/utils";
import { jakeVoice } from "@/lib/jake-scripts";

interface CameraCaptureProps {
  onPhotosCapture: (photos: File[]) => void;
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

  const handleSubmit = () => {
    if (photos.length > 0) {
      onPhotosCapture(photos);
    }
  };

  return (
    <div className={`camera-capture ${className}`}>
      {/* Mode Toggle */}
      <div className="flex gap-2 mb-4">
        <button
          onClick={() => setMode("camera")}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            mode === "camera"
              ? "bg-saloon-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Camera className="w-5 h-5 inline mr-2" />
          Camera
        </button>
        <button
          onClick={() => setMode("upload")}
          className={`flex-1 py-3 px-4 rounded-lg font-medium transition-colors ${
            mode === "upload"
              ? "bg-saloon-500 text-white"
              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
          }`}
        >
          <Upload className="w-5 h-5 inline mr-2" />
          Upload
        </button>
      </div>

      {/* Jake's Guidance */}
      <div className="bg-saloon-50 border-l-4 border-saloon-500 p-4 mb-4 rounded">
        <p className="text-dusty-700">
          {photos.length === 0
            ? jakeVoice.camera.guidance
            : jakeVoice.camera.multiplePhotos}
        </p>
        <p className="text-sm text-dusty-600 mt-1">
          {photos.length} / {maxPhotos} photos
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4 rounded">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Camera View */}
      {mode === "camera" && (
        <div className="mb-4">
          {!isActive && photos.length < maxPhotos && (
            <button
              onClick={startCamera}
              className="w-full py-16 bg-gray-100 hover:bg-gray-200 rounded-lg border-2 border-dashed border-gray-300 transition-colors"
            >
              <Camera className="w-12 h-12 mx-auto mb-2 text-gray-400" />
              <p className="text-gray-600 font-medium">Start Camera</p>
            </button>
          )}

          {isActive && (
            <div className="relative">
              <video
                autoPlay
                playsInline
                className="w-full rounded-lg"
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
                className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center"
                disabled={photos.length >= maxPhotos}
              >
                <div className="w-14 h-14 border-4 border-saloon-500 rounded-full" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Upload View */}
      {mode === "upload" && photos.length < maxPhotos && (
        <label className="block mb-4 cursor-pointer">
          <div className="py-16 bg-gray-100 hover:bg-gray-200 rounded-lg border-2 border-dashed border-gray-300 transition-colors text-center">
            <Upload className="w-12 h-12 mx-auto mb-2 text-gray-400" />
            <p className="text-gray-600 font-medium">
              Click to upload or drag photos here
            </p>
            <p className="text-sm text-gray-500 mt-1">
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
                className="w-full h-32 object-cover rounded-lg"
              />
              <button
                onClick={() => removePhoto(index)}
                className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                aria-label="Remove photo"
              >
                <X className="w-4 h-4" />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-2 py-1 rounded">
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
          className="w-full py-4 bg-saloon-500 hover:bg-saloon-600 text-white font-semibold rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <Check className="w-5 h-5" />
          Show Jake ({photos.length} photo{photos.length > 1 ? "s" : ""})
        </button>
      )}
    </div>
  );
}
