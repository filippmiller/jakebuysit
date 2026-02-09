"use client";

import Link from "next/link";
import { motion } from "framer-motion";

/* ── Jake SVG Illustration ── */
function JakeIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 440 560"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Jake the cowboy holding cash"
    >
      {/* Boots */}
      <path d="M160,490 L155,535 L125,537 L125,525 L148,523 L153,490" fill="#3E2418" />
      <path d="M250,490 L255,535 L285,537 L285,525 L262,523 L257,490" fill="#3E2418" />

      {/* Jeans */}
      <path d="M165,365 L155,492 L195,492 L205,415 L215,492 L255,492 L245,365" fill="#3B4A5C" />
      <line x1="178" y1="375" x2="174" y2="485" stroke="#4A5A6C" strokeWidth="0.7" />
      <line x1="232" y1="375" x2="236" y2="485" stroke="#4A5A6C" strokeWidth="0.7" />

      {/* Belt */}
      <rect x="152" y="353" width="108" height="16" rx="3" fill="#5D3A1A" />
      <rect x="192" y="355" width="28" height="12" rx="3" fill="#DAA520" />
      <rect x="201" y="358" width="10" height="6" rx="1" fill="#B8860B" />

      {/* Shirt */}
      <path d="M160,215 L150,358 L262,358 L252,215" fill="#F2E8D5" />
      <path d="M192,210 L206,255 L220,210" fill="none" stroke="#D4C9B5" strokeWidth="1.2" />
      <circle cx="206" cy="272" r="2" fill="#C9BEA8" />
      <circle cx="206" cy="300" r="2" fill="#C9BEA8" />
      <circle cx="206" cy="328" r="2" fill="#C9BEA8" />

      {/* Vest */}
      <path d="M160,215 L150,358 L188,358 L206,280" fill="#3D3530" />
      <path d="M252,215 L262,358 L224,358 L206,280" fill="#3D3530" />
      <path d="M160,215 L206,280 L192,215 Z" fill="#4A433D" opacity="0.4" />
      <path d="M252,215 L206,280 L220,215 Z" fill="#4A433D" opacity="0.4" />

      {/* Left arm (relaxed, near hip) */}
      <path
        d="M160,222 L125,290 L118,342 L135,346 L140,295 L164,228"
        fill="#F2E8D5"
        stroke="#E5DDD0"
        strokeWidth="0.5"
      />
      <ellipse cx="126" cy="344" rx="12" ry="10" fill="#D4A574" />

      {/* Right arm (raised, holding cash) */}
      <path
        d="M252,222 L290,185 L322,120 L305,112 L280,172 L248,218"
        fill="#F2E8D5"
        stroke="#E5DDD0"
        strokeWidth="0.5"
      />
      <ellipse cx="314" cy="114" rx="14" ry="12" fill="#D4A574" />

      {/* Cash bills (fanned) */}
      <g className="cash-flutter">
        <g transform="rotate(-28,314,80)">
          <rect x="292" y="48" width="52" height="28" rx="3" fill="#2E7D32" />
          <rect x="295" y="51" width="46" height="22" rx="2" fill="none" stroke="#43A047" strokeWidth="0.6" />
          <text x="318" y="67" fill="#81C784" fontSize="15" fontWeight="bold" textAnchor="middle">$</text>
        </g>
        <g transform="rotate(-10,314,75)">
          <rect x="290" y="42" width="52" height="28" rx="3" fill="#388E3C" />
          <rect x="293" y="45" width="46" height="22" rx="2" fill="none" stroke="#4CAF50" strokeWidth="0.6" />
          <text x="316" y="61" fill="#A5D6A7" fontSize="15" fontWeight="bold" textAnchor="middle">$</text>
        </g>
        <g transform="rotate(8,314,70)">
          <rect x="288" y="36" width="52" height="28" rx="3" fill="#43A047" />
          <rect x="291" y="39" width="46" height="22" rx="2" fill="none" stroke="#66BB6A" strokeWidth="0.6" />
          <text x="314" y="55" fill="#C8E6C9" fontSize="15" fontWeight="bold" textAnchor="middle">$</text>
        </g>
        <g transform="rotate(24,314,65)">
          <rect x="286" y="30" width="52" height="28" rx="3" fill="#4CAF50" />
          <rect x="289" y="33" width="46" height="22" rx="2" fill="none" stroke="#81C784" strokeWidth="0.6" />
          <text x="312" y="49" fill="#E8F5E9" fontSize="15" fontWeight="bold" textAnchor="middle">$</text>
        </g>
      </g>

      {/* Bandana */}
      <path d="M185,198 L206,232 L227,198" fill="#C0392B" />
      <path d="M190,202 L206,222 L222,202" fill="#E74C3C" />
      <circle cx="206" cy="202" r="4" fill="#A93226" />

      {/* Neck */}
      <rect x="193" y="182" width="26" height="24" rx="5" fill="#D4A574" />

      {/* Head */}
      <ellipse cx="206" cy="155" rx="40" ry="44" fill="#D4A574" />

      {/* Ears */}
      <ellipse cx="164" cy="155" rx="7" ry="11" fill="#C4956A" />
      <ellipse cx="248" cy="155" rx="7" ry="11" fill="#C4956A" />

      {/* Eyes */}
      <ellipse cx="192" cy="150" rx="4.5" ry="4" fill="#2C1810" />
      <ellipse cx="220" cy="150" rx="4.5" ry="4" fill="#2C1810" />
      <circle cx="193.5" cy="148.5" r="1.5" fill="white" opacity="0.7" />
      <circle cx="221.5" cy="148.5" r="1.5" fill="white" opacity="0.7" />

      {/* Eyebrows */}
      <path d="M184,141 Q192,136 199,140" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" fill="none" />
      <path d="M213,140 Q220,136 228,141" stroke="#8B5E3C" strokeWidth="2.5" strokeLinecap="round" fill="none" />

      {/* Nose */}
      <path d="M206,152 L201,164 Q206,167 211,164 Z" fill="#C4956A" />

      {/* Smirk */}
      <path d="M193,175 Q206,185 225,171" fill="none" stroke="#8B5E3C" strokeWidth="2" strokeLinecap="round" />

      {/* Hat brim */}
      <ellipse cx="206" cy="118" rx="96" ry="16" fill="#8B6914" />
      <ellipse cx="206" cy="116" rx="96" ry="16" fill="#A07D1E" />

      {/* Hat crown */}
      <path d="M162,118 L167,50 Q206,32 245,50 L250,118" fill="#A07D1E" />
      <path d="M162,118 L167,50 Q186,40 206,44 L206,118 Z" fill="#8B6914" opacity="0.25" />
      <path d="M178,55 Q206,68 234,55" fill="#8B6914" opacity="0.3" />

      {/* Hat band */}
      <rect x="164" y="102" width="84" height="12" rx="2" fill="#5D3A1A" />

      {/* Star on hat */}
      <polygon
        points="206,104 208,109 213,109 209,112 211,117 206,114 201,117 203,112 199,109 204,109"
        fill="#DAA520"
      />
    </svg>
  );
}

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

/* ── Hero Section ── */
export function HeroSection() {
  return (
    <section className="relative min-h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-[#0f0d0a]">
      {/* Ambient glows */}
      <div className="absolute top-1/3 right-1/4 w-[600px] h-[600px] rounded-full bg-amber-900/[0.08] blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] rounded-full bg-amber-800/[0.05] blur-[120px] pointer-events-none" />

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
        <div className="max-w-7xl mx-auto px-6 md:px-12 w-full grid lg:grid-cols-2 gap-12 lg:gap-6 items-center py-24 lg:py-0">
          {/* ── Copy ── */}
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
              className="font-display text-[clamp(3rem,7.5vw,6.5rem)] leading-[0.88] font-extrabold text-[#f5f0e8] tracking-tight"
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              SHOW ME
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-300 to-yellow-500">
                WHATCHA
              </span>
              <br />
              GOT.
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

          {/* ── Jake + Blob ── */}
          <motion.div
            className="relative flex items-center justify-center lg:justify-end"
            initial={{ opacity: 0, scale: 0.85, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="hero-blob absolute w-64 h-64 md:w-80 md:h-80 lg:w-[420px] lg:h-[420px]" />
            <JakeIllustration className="relative z-10 w-52 md:w-72 lg:w-[360px] drop-shadow-[0_25px_50px_rgba(0,0,0,0.5)]" />
          </motion.div>
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
