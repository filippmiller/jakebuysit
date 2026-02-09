"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { JakeCharacter } from "./JakeCharacter";
import { JakeState } from "@/lib/jake-scripts";
import { useWebSocket, WebSocketMessage } from "@/hooks/useWebSocket";

interface ResearchAnimationProps {
  offerId: string;
  onComplete: () => void;
  className?: string;
}

type Stage = "looking" | "researching" | "deciding" | "complete";

/**
 * Jake Research Animation - THE SIGNATURE MOMENT
 * 3-stage animated sequence showing Jake's process
 */
export function ResearchAnimation({
  offerId,
  onComplete,
  className = "",
}: ResearchAnimationProps) {
  const [stage, setStage] = useState<Stage>("looking");
  const [labels, setLabels] = useState<string[]>([]);
  const [marketplaceCount, setMarketplaceCount] = useState(0);
  const [salesCount, setSalesCount] = useState(0);
  const [pricePoints, setPricePoints] = useState<number[]>([]);

  // WebSocket connection for real-time updates, with HTTP polling fallback
  const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || (process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080").replace("http", "ws")}/api/v1/offers/${offerId}/stream`;
  const { messages } = useWebSocket(wsUrl, {
    fallbackApiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080",
    offerId,
  });

  // Process WebSocket messages
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];

    if (lastMessage.stage === "looking") {
      setStage("looking");
      if (lastMessage.data.labels) {
        setLabels(lastMessage.data.labels);
      }
    } else if (lastMessage.stage === "researching") {
      setStage("researching");
      if (lastMessage.data.marketplaceCount) {
        setMarketplaceCount(lastMessage.data.marketplaceCount);
      }
      if (lastMessage.data.salesCount) {
        setSalesCount(lastMessage.data.salesCount);
      }
    } else if (lastMessage.stage === "deciding") {
      setStage("deciding");
      if (lastMessage.data.pricePoints) {
        setPricePoints(lastMessage.data.pricePoints);
      }
      // Auto-complete after deciding animation
      setTimeout(() => {
        setStage("complete");
        onComplete();
      }, 3000);
    }
  }, [messages, onComplete]);

  const getJakeState = (): JakeState => {
    switch (stage) {
      case "looking":
        return JakeState.EXAMINING;
      case "researching":
        return JakeState.RESEARCHING;
      case "deciding":
        return JakeState.THINKING;
      default:
        return JakeState.IDLE;
    }
  };

  return (
    <div className={`research-animation min-h-screen flex items-center justify-center ${className}`}>
      <div className="max-w-4xl w-full mx-auto p-8">
        {/* Jake Character */}
        <div className="mb-8">
          <JakeCharacter state={getJakeState()} className="w-full h-64" />
        </div>

        {/* Stage A: Jake Looks */}
        <AnimatePresence>
          {stage === "looking" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-[#f5f0e8] mb-4">
                Alright, let&apos;s see what we got here...
              </h2>

              {/* Animated labels appear */}
              <div className="flex flex-wrap justify-center gap-2 mb-6">
                {labels.map((label, index) => (
                  <motion.div
                    key={label}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: index * 0.2 }}
                    className="px-4 py-2 bg-amber-500/[0.15] border border-amber-400/30 rounded-full text-amber-300 font-medium"
                  >
                    {label}
                  </motion.div>
                ))}
              </div>

              <div className="flex justify-center">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full"
                />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage B: Jake Checks Market */}
        <AnimatePresence>
          {stage === "researching" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-[#f5f0e8] mb-6">
                Checkin&apos; what these are goin&apos; for...
              </h2>

              {/* Network Visualization */}
              <div className="relative h-64 mb-6">
                <svg className="w-full h-full">
                  {/* Central node (Jake) */}
                  <motion.circle
                    cx="50%"
                    cy="50%"
                    r="30"
                    fill="#e89f4d"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                  />

                  {/* Marketplace nodes */}
                  {Array.from({ length: marketplaceCount }).map((_, i) => {
                    const angle = (i / marketplaceCount) * 2 * Math.PI;
                    const cx = 50 + Math.cos(angle) * 35;
                    const cy = 50 + Math.sin(angle) * 35;

                    return (
                      <g key={i}>
                        {/* Connection line */}
                        <motion.line
                          x1="50%"
                          y1="50%"
                          x2={`${cx}%`}
                          y2={`${cy}%`}
                          stroke="#d67d28"
                          strokeWidth="2"
                          strokeOpacity="0.5"
                          initial={{ pathLength: 0 }}
                          animate={{ pathLength: 1 }}
                          transition={{ delay: i * 0.1 }}
                        />
                        {/* Marketplace node */}
                        <motion.circle
                          cx={`${cx}%`}
                          cy={`${cy}%`}
                          r="15"
                          fill="#b66420"
                          fillOpacity="0.6"
                          initial={{ scale: 0 }}
                          animate={{ scale: [0, 1.2, 1] }}
                          transition={{ delay: i * 0.1 }}
                        />
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Counter */}
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="inline-block px-8 py-4 bg-gradient-to-r from-amber-500 to-amber-400 text-[#1a1510] rounded-full text-2xl font-bold"
              >
                <motion.span
                  key={salesCount}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {salesCount}
                </motion.span>{" "}
                recent sales found
              </motion.div>

              <p className="mt-4 text-[#a89d8a] italic">
                &quot;eBay&apos;s movin&apos; these fast...&quot;
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stage C: Jake Decides */}
        <AnimatePresence>
          {stage === "deciding" && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold text-[#f5f0e8] mb-6">
                Now, here&apos;s what I can do for ya...
              </h2>

              {/* Price Histogram */}
              <div className="max-w-md mx-auto mb-6">
                <div className="flex items-end justify-center gap-2 h-48">
                  {pricePoints.map((price, index) => {
                    const maxPrice = Math.max(...pricePoints);
                    const height = (price / maxPrice) * 100;

                    return (
                      <motion.div
                        key={index}
                        initial={{ height: 0 }}
                        animate={{ height: `${height}%` }}
                        transition={{ delay: index * 0.05 }}
                        className="flex-1 bg-gradient-to-t from-amber-600 to-amber-400 rounded-t"
                        style={{ minWidth: "8px" }}
                      />
                    );
                  })}
                </div>
                <div className="flex justify-between text-sm text-[#a89d8a] mt-2">
                  <span>${Math.min(...pricePoints)}</span>
                  <span>${Math.max(...pricePoints)}</span>
                </div>
              </div>

              {/* Converging animation */}
              <motion.div
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="inline-block px-12 py-6 bg-white/[0.07] backdrop-blur-sm border border-white/[0.12] rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.3)]"
              >
                <p className="text-sm text-[#a89d8a] mb-1">Jake&apos;s Offer</p>
                <p className="text-5xl font-bold bg-gradient-to-r from-amber-400 to-amber-300 bg-clip-text text-transparent">Calculating...</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
