"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Laptop,
  Smartphone,
  Gamepad2,
  Cpu,
  Monitor,
  Package,
  type LucideIcon,
} from "lucide-react";

/* ── Category cards data ── */
const CATEGORIES: {
  Icon: LucideIcon;
  name: string;
  bobDur: number;
}[] = [
  { Icon: Laptop, name: "Computers", bobDur: 4.2 },
  { Icon: Smartphone, name: "Cell Phones", bobDur: 3.8 },
  { Icon: Gamepad2, name: "Game Consoles", bobDur: 5.0 },
  { Icon: Cpu, name: "Computer Parts", bobDur: 4.6 },
  { Icon: Monitor, name: "Electronics", bobDur: 4.0 },
  { Icon: Package, name: "Everything Else", bobDur: 5.3 },
];

/* ── Ticker items ── */
const TICKER_ITEMS = [
  "COMPUTERS",
  "CELL PHONES",
  "TECHNOLOGY",
  "QUICK PAYOUT",
  "WE BUY IT ALL",
  "FAIR PRICES",
  "INSTANT OFFERS",
  "ELECTRONICS",
];

/* ── Glassmorphism card ── */
function GlassCard({
  Icon,
  name,
  className = "",
  delay = 0,
  bobDur = 4,
}: {
  Icon: LucideIcon;
  name: string;
  className?: string;
  delay?: number;
  bobDur?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 24, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
    >
      <motion.div
        className="backdrop-blur-xl bg-white/[0.07] border border-white/[0.12] rounded-2xl px-4 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.2)] flex items-center gap-3 cursor-default hover:bg-white/[0.12] hover:border-white/[0.22] hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] transition-all duration-300"
        animate={{ y: [0, -6, 0] }}
        transition={{
          duration: bobDur,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        whileHover={{ scale: 1.06 }}
      >
        <div className="w-9 h-9 rounded-xl bg-amber-500/[0.15] border border-amber-400/[0.1] flex items-center justify-center shrink-0">
          <Icon className="w-[18px] h-[18px] text-amber-400" />
        </div>
        <span className="text-sm font-medium text-white/80 whitespace-nowrap">
          {name}
        </span>
      </motion.div>
    </motion.div>
  );
}

/* ── Animated speech bubbles ── */
const SPEECH_LINES = [
  "Ma name is Jack",
  "I pay quick,\nI pay shipping too.",
  "Show me whatcha got!",
];

function SpeechBubbles() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((prev) => (prev + 1) % SPEECH_LINES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute -right-4 top-[20%] z-30 lg:-right-6 lg:top-[18%]">
      <AnimatePresence mode="wait">
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: -10 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="relative bg-white rounded-2xl px-5 py-3.5 shadow-[0_8px_30px_rgba(0,0,0,0.35)] max-w-[230px]">
            <p className="text-[#1a1510] font-bold text-[15px] leading-snug whitespace-pre-line">
              {SPEECH_LINES[index]}
            </p>
            {/* Tail pointing left (towards Jake's mouth) */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-[10px] w-0 h-0 border-t-[9px] border-b-[9px] border-r-[12px] border-t-transparent border-b-transparent border-r-white" />
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/* ── Hero Section ── */
export function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[#0f0d0a]">
      {/* Ambient glows */}
      <div className="absolute top-1/4 right-1/3 w-[700px] h-[700px] rounded-full bg-amber-900/[0.08] blur-[160px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/4 w-[400px] h-[400px] rounded-full bg-amber-800/[0.05] blur-[120px] pointer-events-none" />

      {/* Floating $ signs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 10 }).map((_, i) => (
          <span
            key={i}
            className="absolute text-amber-500/[0.07] font-black select-none hero-float-up"
            style={{
              left: `${8 + i * 9}%`,
              animationDuration: `${10 + i * 2}s`,
              animationDelay: `${i * 1.5}s`,
              fontSize: `${20 + (i % 4) * 12}px`,
            }}
          >
            $
          </span>
        ))}
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-center relative z-10">
        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full grid lg:grid-cols-[1fr,auto,1fr] gap-10 lg:gap-6 items-center py-20 lg:py-0">
          {/* ── Left: Copy ── */}
          <div>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
            >
              <span className="inline-block px-4 py-1.5 mb-6 text-xs font-semibold tracking-[0.2em] uppercase text-amber-400/80 border border-amber-400/20 rounded-full">
                AI-Powered Pawn Shop
              </span>
            </motion.div>

            <motion.h1
              className="font-display font-extrabold text-[#f5f0e8] tracking-tight"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.8,
                delay: 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <span className="block text-[clamp(3rem,7.5vw,6.5rem)] leading-[0.88]">
                SHOW ME
              </span>
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500 text-[clamp(2rem,5vw,4rem)] leading-[1.1] my-2 tracking-[0.15em]">
                WHATCHA
              </span>
              <span className="block text-[clamp(3rem,7.5vw,6.5rem)] leading-[0.88]">
                GOT.
              </span>
            </motion.h1>

            <motion.p
              className="mt-7 text-lg md:text-xl text-[#a89d8a] max-w-md leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.25 }}
            >
              We buy it all — computers, cell phones, technology.{" "}
              <span className="text-[#c3bbad] font-medium">
                Quick payout. No BS.
              </span>
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.4 }}
              className="mt-10"
            >
              <Link
                href="/submit"
                className="group inline-flex items-center gap-3 px-10 py-5 bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-yellow-400 text-[#1a1510] text-lg font-bold rounded-full transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_50px_rgba(245,158,11,0.25)]"
              >
                Get Your Offer
                <span className="inline-block transition-transform duration-300 group-hover:translate-x-1 text-xl">
                  →
                </span>
              </Link>
            </motion.div>

            <motion.div
              className="mt-8 flex flex-wrap gap-3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.55, duration: 0.6 }}
            >
              {["Instant offers", "Fair market prices", "Paid in 24h"].map(
                (text) => (
                  <span
                    key={text}
                    className="px-4 py-2 rounded-full border border-[#2a2520] text-sm text-[#706557] bg-[#1a1714]"
                  >
                    {text}
                  </span>
                )
              )}
            </motion.div>
          </div>

          {/* ── Center: Glass cards stack ── */}
          <motion.div
            className="hidden lg:flex flex-col gap-3 justify-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: [0.16, 1, 0.3, 1] }}
          >
            {CATEGORIES.map((cat, i) => (
              <GlassCard
                key={cat.name}
                Icon={cat.Icon}
                name={cat.name}
                delay={0.35 + i * 0.08}
                bobDur={cat.bobDur}
              />
            ))}
          </motion.div>

          {/* ── Right: Jake photo ── */}
          <motion.div
            className="relative flex items-center justify-center lg:justify-end"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              duration: 1,
              delay: 0.15,
              ease: [0.16, 1, 0.3, 1],
            }}
          >
            {/* Blob behind Jake */}
            <div className="hero-blob absolute w-64 h-64 md:w-80 md:h-80 lg:w-[480px] lg:h-[480px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />

            <div className="relative">
              {/* Animated speech bubbles */}
              <SpeechBubbles />

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/jack1.png"
                alt="Jake holding cash"
                className="relative z-10 w-60 md:w-80 lg:w-[450px] h-auto object-contain drop-shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
              />
            </div>
          </motion.div>

          {/* Mobile / tablet: grid of glass cards */}
          <div className="lg:hidden col-span-full">
            <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto">
              {CATEGORIES.map((cat, i) => (
                <GlassCard
                  key={cat.name}
                  Icon={cat.Icon}
                  name={cat.name}
                  delay={0.3 + i * 0.08}
                  bobDur={0}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Scrolling ticker ── */}
      <div className="relative z-10 border-t border-[#1f1b17] bg-[#0a0908]/80 backdrop-blur-sm py-4 overflow-hidden">
        <div className="flex animate-ticker">
          {[0, 1].map((setIdx) => (
            <div
              key={setIdx}
              className="flex shrink-0 items-center gap-8 pr-8"
            >
              {TICKER_ITEMS.map((item, i) => (
                <span
                  key={`${setIdx}-${i}`}
                  className="flex items-center gap-8"
                >
                  <span className="text-[#4a4035] font-display text-sm tracking-[0.25em] uppercase whitespace-nowrap">
                    {item}
                  </span>
                  <span className="text-amber-700/40 text-xs">&#9670;</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
