"use client";

import { useEffect, useRef, useState } from "react";
import { useRive, useStateMachineInput } from "@rive-app/react-canvas";
import { JakeState } from "@/lib/jake-scripts";

interface JakeCharacterProps {
  state?: JakeState;
  className?: string;
  width?: number;
  height?: number;
}

/**
 * Jake Character Component
 * Integrates Rive animation with state machine control
 */
export function JakeCharacter({
  state = JakeState.IDLE,
  className = "",
  width,
  height,
}: JakeCharacterProps) {
  const [isLoaded, setIsLoaded] = useState(false);

  // Rive integration
  const { rive, RiveComponent } = useRive({
    src: "/jake/character.riv", // Jake's Rive file
    stateMachines: "JakeStateMachine",
    autoplay: true,
    onLoad: () => {
      setIsLoaded(true);
    },
  });

  // State machine input for controlling Jake's state
  const stateInput = useStateMachineInput(
    rive,
    "JakeStateMachine",
    "state"
  );

  // Update Jake's animation state when prop changes
  useEffect(() => {
    if (stateInput && isLoaded) {
      // Convert JakeState enum to number for Rive state machine
      const stateMap: Record<JakeState, number> = {
        [JakeState.IDLE]: 0,
        [JakeState.EXAMINING]: 1,
        [JakeState.RESEARCHING]: 2,
        [JakeState.EXCITED]: 3,
        [JakeState.OFFERING]: 4,
        [JakeState.CELEBRATING]: 5,
        [JakeState.SYMPATHETIC]: 6,
        [JakeState.DISAPPOINTED]: 7,
        [JakeState.SUSPICIOUS]: 8,
        [JakeState.THINKING]: 9,
      };
      stateInput.value = stateMap[state] ?? 0;
    }
  }, [state, stateInput, isLoaded]);

  return (
    <div className={`jake-character ${className}`}>
      {!isLoaded && (
        <div className="flex items-center justify-center animate-pulse">
          <span className="text-6xl">🤠</span>
        </div>
      )}
      <RiveComponent
        style={{
          width: width || "100%",
          height: height || "100%",
        }}
      />
    </div>
  );
}

/**
 * Fallback Jake (if Rive fails)
 */
export function JakeFallback({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div className="text-center">
        <span className="text-8xl block mb-4">🤠</span>
        <p className="text-lg text-dusty-600">Jake's on his way...</p>
      </div>
    </div>
  );
}
