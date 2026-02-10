"use client";

import { useState } from "react";
import { SubmissionData } from "../SubmitWizard";

interface ContactStepProps {
  data: SubmissionData;
  onNext: (data: Partial<SubmissionData>) => void;
  onBack: () => void;
  currentStep: number;
}

export function ContactStep({ data, onNext, onBack }: ContactStepProps) {
  const [name, setName] = useState(data.name || "");
  const [email, setEmail] = useState(data.email || "");
  const [phone, setPhone] = useState(data.phone || "");
  const [includeShipping, setIncludeShipping] = useState(false);
  const [address, setAddress] = useState(
    data.address || {
      street: "",
      city: "",
      state: "",
      zip: "",
    }
  );

  const handleContinue = () => {
    if (!name || !email || !phone) {
      return;
    }

    onNext({
      name,
      email,
      phone,
      address: includeShipping ? address : undefined,
    });
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isValidPhone = (phone: string) => {
    return /^\d{10,}$/.test(phone.replace(/\D/g, ""));
  };

  const isValid =
    name.trim().length > 0 &&
    isValidEmail(email) &&
    isValidPhone(phone) &&
    (!includeShipping ||
      (address.street && address.city && address.state && address.zip));

  return (
    <div>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-3xl sm:text-4xl font-bold text-[#f5f0e8] mb-2">
          How Can Jake Reach You?
        </h1>
        <p className="text-lg sm:text-xl text-[#a89d8a]">
          Jake will send your offer here
        </p>
      </div>

      {/* Jake's Guidance */}
      <div className="bg-white/[0.05] border-l-4 border-amber-500 p-4 mb-6 rounded-lg backdrop-blur-sm">
        <p className="text-[#c3bbad] text-sm">
          Don't worry, partner. Your info stays private. Jake'll reach out once
          he's looked over your item — usually takes under a minute.
        </p>
      </div>

      {/* Form */}
      <div className="bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)] p-4 sm:p-6 space-y-5">
        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-[#c3bbad] mb-2">
            Name
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should Jake call you?"
            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-semibold text-[#c3bbad] mb-2">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="your.email@example.com"
            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
          />
          {email && !isValidEmail(email) && (
            <p className="text-xs text-red-400 mt-1">
              That don't look like a valid email, partner
            </p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-semibold text-[#c3bbad] mb-2">
            Phone
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="(555) 123-4567"
            className="w-full px-4 py-3 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
          />
          {phone && !isValidPhone(phone) && (
            <p className="text-xs text-red-400 mt-1">
              Need at least 10 digits for a phone number
            </p>
          )}
        </div>

        {/* Shipping Address (Optional) */}
        <div className="pt-4 border-t border-white/[0.1]">
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              className={`
                w-5 h-5 rounded border-2 flex items-center justify-center transition-colors
                ${
                  includeShipping
                    ? "bg-amber-400 border-amber-400"
                    : "border-white/[0.2] group-hover:border-white/[0.3]"
                }
              `}
            >
              {includeShipping && (
                <svg
                  className="w-3 h-3 text-[#1a1510]"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={3}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              )}
            </div>
            <span className="text-sm text-[#c3bbad] group-hover:text-[#f5f0e8] transition-colors">
              I'm ready to ship (add shipping address)
            </span>
          </label>
          <p className="text-xs text-[#706557] mt-1 ml-8">
            Optional — you can add this later if Jake makes an offer
          </p>

          {/* Address Fields */}
          {includeShipping && (
            <div className="mt-4 space-y-3 ml-8">
              <input
                type="text"
                value={address.street}
                onChange={(e) =>
                  setAddress({ ...address, street: e.target.value })
                }
                placeholder="Street address"
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  value={address.city}
                  onChange={(e) =>
                    setAddress({ ...address, city: e.target.value })
                  }
                  placeholder="City"
                  className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
                />
                <input
                  type="text"
                  value={address.state}
                  onChange={(e) =>
                    setAddress({ ...address, state: e.target.value })
                  }
                  placeholder="State"
                  className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
                />
              </div>
              <input
                type="text"
                value={address.zip}
                onChange={(e) =>
                  setAddress({ ...address, zip: e.target.value })
                }
                placeholder="ZIP code"
                className="w-full px-4 py-2.5 bg-white/[0.05] border border-white/[0.1] rounded-lg text-[#f5f0e8] placeholder-[#706557] text-sm focus:outline-none focus:ring-1 focus:ring-amber-500/50 focus:border-amber-500/50 transition-colors"
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 py-4 bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.1] text-[#c3bbad] font-semibold rounded-lg transition-all"
        >
          ← Back to Details
        </button>
        <button
          onClick={handleContinue}
          disabled={!isValid}
          className="flex-1 py-4 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 disabled:from-gray-600 disabled:to-gray-500 disabled:cursor-not-allowed text-[#1a1510] font-semibold rounded-lg transition-all shadow-[0_4px_16px_rgba(245,158,11,0.2)] hover:shadow-[0_4px_24px_rgba(245,158,11,0.3)]"
        >
          Review & Submit →
        </button>
      </div>
    </div>
  );
}
