"use client";

import { useState, useEffect } from "react";
import { Clock, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";

interface PriceLockCountdownProps {
  expiresAt: string; // ISO timestamp
  isExpired: boolean;
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}

function getTimeLeft(expiresAt: string): TimeLeft {
  const now = new Date();
  const expires = new Date(expiresAt);
  const diff = expires.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0 };
  }

  return {
    days: Math.floor(diff / (1000 * 60 * 60 * 24)),
    hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
    minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
    seconds: Math.floor((diff % (1000 * 60)) / 1000),
  };
}

export function PriceLockCountdown({
  expiresAt,
  isExpired,
}: PriceLockCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(getTimeLeft(expiresAt));
  const [mounted, setMounted] = useState(false);

  // Track mounted state to avoid hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  // Live countdown timer
  useEffect(() => {
    if (isExpired) return;

    const timer = setInterval(() => {
      setTimeLeft(getTimeLeft(expiresAt));
    }, 1000);

    return () => clearInterval(timer);
  }, [expiresAt, isExpired]);

  // Calculate urgency (less than 7 days remaining)
  const isUrgent = timeLeft.days < 7 && !isExpired;

  // Expired State
  if (isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg"
      >
        <div className="flex items-center gap-2 text-red-400 mb-2">
          <AlertCircle className="w-5 h-5" />
          <span className="font-semibold">This offer has expired</span>
        </div>
        <p className="text-sm text-[#a89d8a] leading-relaxed">
          &ldquo;Sorry partner, that offer&apos;s gone cold. Submit your item
          again for a fresh quote.&rdquo;
        </p>
      </motion.div>
    );
  }

  // Don't render countdown until mounted (avoid hydration issues)
  if (!mounted) {
    return (
      <div className="p-4 bg-white/[0.03] border border-white/[0.07] rounded-lg animate-pulse">
        <div className="h-20 bg-white/[0.05] rounded" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-4 rounded-lg border ${
        isUrgent
          ? "bg-amber-400/10 border-amber-400/30"
          : "bg-white/[0.03] border-white/[0.07]"
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-3">
        <Clock
          className={`w-5 h-5 ${
            isUrgent ? "text-amber-400 animate-pulse" : "text-[#a89d8a]"
          }`}
        />
        <span
          className={`font-semibold ${
            isUrgent ? "text-amber-400" : "text-[#f5f0e8]"
          }`}
        >
          This offer expires in:
        </span>
      </div>

      {/* Countdown Display */}
      <div className="flex gap-4 mb-3">
        <div className="flex-1 text-center">
          <motion.div
            key={timeLeft.days}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-bold text-amber-400"
          >
            {timeLeft.days}
          </motion.div>
          <div className="text-xs text-[#706557] mt-1">days</div>
        </div>
        <div className="flex-1 text-center">
          <motion.div
            key={timeLeft.hours}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-bold text-amber-400"
          >
            {timeLeft.hours}
          </motion.div>
          <div className="text-xs text-[#706557] mt-1">hours</div>
        </div>
        <div className="flex-1 text-center">
          <motion.div
            key={timeLeft.minutes}
            initial={{ scale: 1.2, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-bold text-amber-400"
          >
            {timeLeft.minutes}
          </motion.div>
          <div className="text-xs text-[#706557] mt-1">mins</div>
        </div>
        {timeLeft.days === 0 && (
          <div className="flex-1 text-center">
            <motion.div
              key={timeLeft.seconds}
              initial={{ scale: 1.2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-3xl font-bold text-amber-400"
            >
              {timeLeft.seconds}
            </motion.div>
            <div className="text-xs text-[#706557] mt-1">secs</div>
          </div>
        )}
      </div>

      {/* Jake's Note */}
      <div
        className={`text-sm italic leading-relaxed ${
          isUrgent ? "text-amber-300/90" : "text-[#a89d8a]"
        }`}
      >
        &ldquo;I&apos;ll hold this for 30 days. Take your time, partner.&rdquo;
      </div>

      {/* Urgency Warning */}
      {isUrgent && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-3 pt-3 border-t border-amber-400/20"
        >
          <p className="text-xs text-amber-400 font-medium">
            ⚠️ Less than a week left — accept soon if you want this deal
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}
