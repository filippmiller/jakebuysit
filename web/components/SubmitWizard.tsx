"use client";

import { useState } from "react";
import { PhotoStep } from "./wizard/PhotoStep";
import { DetailsStep } from "./wizard/DetailsStep";
import { ContactStep } from "./wizard/ContactStep";
import { ReviewStep } from "./wizard/ReviewStep";
import { PhotoData } from "./CameraCapture";

export interface SubmissionData {
  photos: PhotoData[];
  category?: string;
  description?: string;
  condition?: "excellent" | "good" | "fair" | "poor";
  name?: string;
  email?: string;
  phone?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    zip: string;
  };
}

export function SubmitWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<SubmissionData>({
    photos: [],
  });

  const steps = [
    { number: 1, title: "Photos", component: PhotoStep },
    { number: 2, title: "Details", component: DetailsStep },
    { number: 3, title: "Contact", component: ContactStep },
    { number: 4, title: "Review", component: ReviewStep },
  ];

  const CurrentStepComponent = steps[currentStep - 1].component;

  const handleNext = (stepData: Partial<SubmissionData>) => {
    setData((prev) => ({ ...prev, ...stepData }));
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <main className="min-h-screen bg-[#0f0d0a] relative overflow-hidden">
      {/* Ambient Glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/[0.04] rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-amber-400/[0.03] rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 pt-20 pb-12 px-4">
        <div className="max-w-2xl mx-auto">
          {/* Progress Stepper */}
          <div className="mb-8">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={step.number} className="flex items-center flex-1">
                  {/* Step Circle */}
                  <div className="relative flex flex-col items-center">
                    <div
                      className={`
                        w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm
                        transition-all duration-300
                        ${
                          currentStep === step.number
                            ? "bg-gradient-to-r from-amber-500 to-amber-400 text-[#1a1510] scale-110 shadow-[0_4px_16px_rgba(245,158,11,0.3)]"
                            : currentStep > step.number
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                              : "bg-white/[0.07] text-[#706557] border border-white/[0.1]"
                        }
                      `}
                    >
                      {currentStep > step.number ? "✓" : step.number}
                    </div>
                    <span
                      className={`
                        text-xs mt-2 font-medium transition-colors hidden sm:block
                        ${
                          currentStep === step.number
                            ? "text-amber-400"
                            : currentStep > step.number
                              ? "text-amber-500/70"
                              : "text-[#706557]"
                        }
                      `}
                    >
                      {step.title}
                    </span>
                  </div>

                  {/* Connector Line */}
                  {index < steps.length - 1 && (
                    <div
                      className={`
                        h-[2px] flex-1 mx-2 transition-all duration-300
                        ${
                          currentStep > step.number
                            ? "bg-gradient-to-r from-amber-500/50 to-amber-400/30"
                            : "bg-white/[0.1]"
                        }
                      `}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Mobile Progress Text */}
            <div className="sm:hidden text-center">
              <p className="text-sm text-[#a89d8a]">
                Step {currentStep} of {steps.length}:{" "}
                <span className="text-amber-400 font-medium">
                  {steps[currentStep - 1].title}
                </span>
              </p>
            </div>
          </div>

          {/* Step Content */}
          <CurrentStepComponent
            data={data}
            onNext={handleNext}
            onBack={handleBack}
            currentStep={currentStep}
          />
        </div>
      </div>
    </main>
  );
}
