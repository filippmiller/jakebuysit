"use client";

import { useState, useEffect, useRef } from "react";
import { Howl } from "howler";
import { Play, Pause, Volume2, VolumeX } from "lucide-react";

interface JakeVoiceProps {
  audioUrl: string;
  transcript?: string;
  autoPlay?: boolean;
  className?: string;
}

/**
 * Jake Voice UI Component
 * Voice message player with waveform visualization
 */
export function JakeVoice({
  audioUrl,
  transcript,
  autoPlay = false,
  className = "",
}: JakeVoiceProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [showTranscript, setShowTranscript] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const soundRef = useRef<Howl | null>(null);
  const progressInterval = useRef<NodeJS.Timeout | null>(null);

  // Initialize Howler
  useEffect(() => {
    const sound = new Howl({
      src: [audioUrl],
      html5: true,
      onload: () => {
        setDuration(sound.duration());
      },
      onplay: () => {
        setIsPlaying(true);
        // Update progress
        progressInterval.current = setInterval(() => {
          if (sound.playing()) {
            setProgress((sound.seek() as number) || 0);
          }
        }, 100);
      },
      onpause: () => {
        setIsPlaying(false);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      },
      onend: () => {
        setIsPlaying(false);
        setProgress(0);
        if (progressInterval.current) {
          clearInterval(progressInterval.current);
        }
      },
    });

    soundRef.current = sound;

    if (autoPlay) {
      sound.play();
    }

    return () => {
      sound.unload();
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, [audioUrl, autoPlay]);

  const togglePlay = () => {
    if (!soundRef.current) return;

    if (isPlaying) {
      soundRef.current.pause();
    } else {
      soundRef.current.play();
    }
  };

  const toggleMute = () => {
    if (!soundRef.current) return;
    soundRef.current.mute(!isMuted);
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!soundRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = x / rect.width;
    const seekTime = percentage * duration;
    soundRef.current.seek(seekTime);
    setProgress(seekTime);
  };

  return (
    <div className={`jake-voice bg-saloon-50 border-2 border-saloon-300 rounded-2xl p-4 ${className}`}>
      {/* Jake Avatar */}
      <div className="flex items-start gap-3 mb-3">
        <div className="w-10 h-10 bg-saloon-500 rounded-full flex items-center justify-center text-xl">
          🤠
        </div>
        <div className="flex-1">
          <p className="text-sm font-semibold text-dusty-800">Jake</p>
          <p className="text-xs text-dusty-600">Voice Message</p>
        </div>
        <button
          onClick={toggleMute}
          className="p-2 hover:bg-saloon-100 rounded-full transition-colors"
          aria-label={isMuted ? "Unmute" : "Mute"}
        >
          {isMuted ? (
            <VolumeX className="w-4 h-4 text-dusty-600" />
          ) : (
            <Volume2 className="w-4 h-4 text-dusty-600" />
          )}
        </button>
      </div>

      {/* Waveform / Progress Bar */}
      <div className="mb-3">
        <div
          className="h-12 bg-saloon-100 rounded-lg cursor-pointer relative overflow-hidden"
          onClick={handleSeek}
        >
          <div
            className="absolute top-0 left-0 h-full bg-saloon-400 transition-all"
            style={{ width: `${(progress / duration) * 100}%` }}
          />
          {/* Waveform visualization (simplified) */}
          <div className="absolute inset-0 flex items-center justify-around px-2">
            {Array.from({ length: 40 }).map((_, i) => (
              <div
                key={i}
                className="w-1 bg-saloon-500 rounded-full"
                style={{
                  height: `${Math.random() * 70 + 30}%`,
                  opacity: (progress / duration) * 40 > i ? 1 : 0.3,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between">
        <button
          onClick={togglePlay}
          className="flex items-center gap-2 px-4 py-2 bg-saloon-500 hover:bg-saloon-600 text-white rounded-full transition-colors"
          aria-label={isPlaying ? "Pause" : "Play"}
        >
          {isPlaying ? (
            <Pause className="w-5 h-5" />
          ) : (
            <Play className="w-5 h-5" />
          )}
          <span className="text-sm font-medium">
            {isPlaying ? "Pause" : "Play"}
          </span>
        </button>

        <div className="text-sm text-dusty-600">
          {formatTime(progress)} / {formatTime(duration)}
        </div>

        {transcript && (
          <button
            onClick={() => setShowTranscript(!showTranscript)}
            className="text-sm text-saloon-600 hover:underline"
          >
            {showTranscript ? "Hide" : "Show"} Transcript
          </button>
        )}
      </div>

      {/* Transcript */}
      {showTranscript && transcript && (
        <div className="mt-4 p-3 bg-white rounded-lg border border-saloon-200">
          <p className="text-sm text-dusty-700">{transcript}</p>
        </div>
      )}
    </div>
  );
}
