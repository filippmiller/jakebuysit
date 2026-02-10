"use client";

import { useState, useEffect } from "react";
import { SubmissionData } from "../SubmitWizard";

interface DetailsStepProps {
  data: SubmissionData;
  onNext: (data: Partial<SubmissionData>) => void;
  onBack: () => void;
  currentStep: number;
}

const CATEGORIES = [
  "Electronics",
  "Jewelry",
  "Tools",
  "Musical Instruments",
  "Sports Equipment",
  "Collectibles",
  "Firearms",
  "Home Appliances",
  "Gaming",
  "Other",
];

const CONDITIONS = [
  { value: "excellent", label: "Excellent", description: "Like new, minimal wear" },
  { value: "good", label: "Good", description: "Normal wear, fully functional" },
  { value: "fair", label: "Fair", description: "Noticeable wear, works fine" },
  { value: "poor", label: "Poor", description: "Heavy wear or not working" },
] as const;

export function DetailsStep({ data, onNext, onBack }: DetailsStepProps) {
  const [category, setCategory] = useState(data.category || "");
  const [description, setDescription] = useState(data.description || "");
  const [condition, setCondition] = useState<SubmissionData["condition"]>(
    data.condition || undefined
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  // Simulate AI analysis (in production, this would call Agent 2 Vision API)
  useEffect(() => {
    if (data.photos.length > 0 && !description) {
      setIsAnalyzing(true);

      // Simulate AI processing delay
      setTimeout(() => {
        setAiSuggestion(
          "Based on the photos, this appears to be an electronic device in good condition. You can edit this description if needed."
        );
        setDescription(
          "Based on the photos, this appears to be an electronic device in good condition."
        );
        setCategory("Electronics");
        setCondition("good");
        setIsAnalyzing(false);
      }, 1500);
    }
  }, [data.photos.length, description]);

  const handleContinue = () => {
    if (!category || !description || !condition) {
      return;
    }

    onNext({ category, description, condition });
  };

  const isValid = category && description.trim().length > 0 && condition;

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#f5f0e8] mb-2">
          Tell Jake About It
        </h1>
        <p className="text-lg sm:text-xl text-[#a89d8a]">
          {isAnalyzing ? "Jake's takin' a look..." : "Review and edit the details"}
        </p>
      </div>

      {/* AI Analysis Status */}
      {isAnalyzing && (
        <div className="bg-white/[0.05] border-l-4 border-amber-500 p-4 mb-6 rounded-lg backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-5 h-5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            <p className="text-[#c3bbad]">
              Hold tight, Jake's analyzin' your photos with his AI eyes...
            </p>
          </div>
        </div>
      )}

      {/* AI Suggestion Notice */}
      {aiSuggestion && !isAnalyzing && (
        <div className="bg-green-500/10 border-l-4 border-green-500 p-4 mb-6 rounded-lg backdrop-blur-sm">
          <p className="text-green-300 text-sm">
            ✓ Jake filled this out for you. Feel free to edit anything that needs fixin'.
          </p>
        </div>
      )}

      {/* Form */}
      <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-4 sm:p-6 space-y-6">
        {/* Category */}
        <div>
          <label className="block text-sm font-semibold text-[#c3bbad] mb-2">
            Category
          </label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
          >
            <option value="" className="bg-[#1a1510]">Select a category...</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat} className="bg-[#1a1510]">
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-semibold text-[#c3bbad] mb-2">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell Jake what you've got..."
            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 resize-none transition-colors"
            rows={4}
            maxLength={1000}
          />
          <div className="flex justify-between mt-1">
            <span className="text-xs text-[#706557]">
              Tell Jake about brand, model, condition, or anything special
            </span>
            {description.length > 800 && (
              <span className="text-xs text-amber-400">
                {description.length}/1000
              </span>
            )}
          </div>
        </div>

        {/* Condition */}
        <div>
          <label className="block text-sm font-semibold text-[#c3bbad] mb-3">
            Condition
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {CONDITIONS.map((cond) => (
              <button
                key={cond.value}
                onClick={() => setCondition(cond.value)}
                className={`
                  p-4 rounded-lg border transition-all text-left
                  ${
                    condition === cond.value
                      ? "bg-amber-500/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.15)]"
                      : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.05] hover:border-white/[0.12]"
                  }
                `}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors
                    ${
                      condition === cond.value
                        ? "border-amber-400 bg-amber-400"
                        : "border-white/[0.2]"
                    }
                  `}
                  >
                    {condition === cond.value && (
                      <div className="w-2 h-2 bg-[#1a1510] rounded-full" />
                    )}
                  </div>
                  <div className="flex-1">
                    <p
                      className={`font-medium ${
                        condition === cond.value
                          ? "text-amber-400"
                          : "text-[#f5f0e8]"
                      }`}
                    >
                      {cond.label}
                    </p>
                    <p className="text-xs text-[#706557] mt-0.5">
                      {cond.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-4 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] text-[#c3bbad] font-semibold rounded-lg transition-all"
        >
          ← Back to Photos
        </button>
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-[#1a1510] font-semibold rounded-lg transition-all shadow-[0_4px_16px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_24px_rgba(245,158,11,0.3)]"
        >
          Continue to Contact →
        </button>
      </div>
    </div>
  );
}
