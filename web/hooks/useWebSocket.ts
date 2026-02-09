"use client";

import { useEffect, useState, useCallback, useRef } from "react";

export interface WebSocketMessage {
  stage: "looking" | "researching" | "deciding";
  data: any;
  jakeMessage?: string;
}

export interface WebSocketHook {
  messages: WebSocketMessage[];
  isConnected: boolean;
  error: string | null;
  sendMessage: (message: any) => void;
}

interface UseWebSocketOptions {
  fallbackApiUrl?: string;
  offerId?: string;
}

const TERMINAL_STATUSES = ["ready", "expired", "failed", "escalated"];
const WS_CONNECT_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 3000;

function mapOfferToMessage(offer: any): WebSocketMessage | null {
  const processingStage: string | undefined = offer.processingStage;

  switch (processingStage) {
    case "vision":
      return {
        stage: "looking",
        data: { labels: offer.item?.features || [] },
      };
    case "marketplace":
      return {
        stage: "researching",
        data: {
          marketplaceCount: 5,
          salesCount: offer.marketData?.stats?.count || 0,
        },
      };
    case "pricing":
    case "jake-voice":
      return {
        stage: "deciding",
        data: { pricePoints: [] },
      };
    default:
      return null;
  }
}

export function useWebSocket(
  url: string | null,
  options?: UseWebSocketOptions
): WebSocketHook {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const connectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isPollingRef = useRef(false);
  const lastSeenStageRef = useRef<string | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    isPollingRef.current = false;
  }, []);

  const startPolling = useCallback(() => {
    const { fallbackApiUrl, offerId } = options || {};
    if (!fallbackApiUrl || !offerId || isPollingRef.current) return;

    isPollingRef.current = true;
    setIsConnected(true);
    setError(null);

    const poll = async () => {
      try {
        const response = await fetch(
          `${fallbackApiUrl}/api/v1/offers/${offerId}`
        );
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }

        const offer = await response.json();

        // Check for terminal statuses
        if (TERMINAL_STATUSES.includes(offer.status)) {
          stopPolling();
          if (offer.status === "ready") {
            setMessages((prev) => [
              ...prev,
              {
                stage: "deciding",
                data: { pricePoints: [], complete: true },
                jakeMessage: "All done, partner.",
              },
            ]);
          }
          return;
        }

        // Map processing stage to WebSocket message format
        const message = mapOfferToMessage(offer);
        if (message && offer.processingStage !== lastSeenStageRef.current) {
          lastSeenStageRef.current = offer.processingStage;
          setMessages((prev) => [...prev, message]);
        }
      } catch (err) {
        console.error("Polling error:", err);
      }
    };

    // Poll immediately, then on interval
    poll();
    pollingRef.current = setInterval(poll, POLL_INTERVAL_MS);
  }, [options?.fallbackApiUrl, options?.offerId, stopPolling]);

  useEffect(() => {
    // Cleanup function for all timers
    const cleanup = () => {
      if (connectTimeoutRef.current) {
        clearTimeout(connectTimeoutRef.current);
        connectTimeoutRef.current = null;
      }
      stopPolling();
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };

    if (!url) return cleanup;

    let wsDidConnect = false;
    let fallbackTriggered = false;

    const triggerFallback = () => {
      if (fallbackTriggered) return;
      fallbackTriggered = true;

      if (options?.fallbackApiUrl && options?.offerId) {
        console.info(
          "WebSocket unavailable, falling back to HTTP polling"
        );
        startPolling();
      }
    };

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      // Start a connection timeout -- if WebSocket hasn't opened in 5s, fall back
      connectTimeoutRef.current = setTimeout(() => {
        if (!wsDidConnect) {
          console.warn(
            "WebSocket connection timed out after 5 seconds"
          );
          ws.close();
          triggerFallback();
        }
      }, WS_CONNECT_TIMEOUT_MS);

      ws.onopen = () => {
        wsDidConnect = true;
        setIsConnected(true);
        setError(null);

        if (connectTimeoutRef.current) {
          clearTimeout(connectTimeoutRef.current);
          connectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setMessages((prev) => [...prev, message]);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = () => {
        setError("Connection error");
        triggerFallback();
      };

      ws.onclose = () => {
        setIsConnected(false);
        if (!wsDidConnect) {
          triggerFallback();
        }
      };

      return cleanup;
    } catch (err) {
      setError("Failed to connect");
      console.error("WebSocket initialization error:", err);
      triggerFallback();
      return cleanup;
    }
  }, [url, options?.fallbackApiUrl, options?.offerId, startPolling, stopPolling]);

  const sendMessage = useCallback((message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    }
  }, []);

  return {
    messages,
    isConnected,
    error,
    sendMessage,
  };
}
