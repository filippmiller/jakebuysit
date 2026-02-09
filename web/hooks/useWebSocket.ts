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

export function useWebSocket(url: string | null): WebSocketHook {
  const [messages, setMessages] = useState<WebSocketMessage[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!url) return;

    try {
      const ws = new WebSocket(url);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          setMessages((prev) => [...prev, message]);
        } catch (err) {
          console.error("Failed to parse WebSocket message:", err);
        }
      };

      ws.onerror = (event) => {
        setError("Connection error");
        console.error("WebSocket error:", event);
      };

      ws.onclose = () => {
        setIsConnected(false);
      };

      return () => {
        ws.close();
      };
    } catch (err) {
      setError("Failed to connect");
      console.error("WebSocket initialization error:", err);
    }
  }, [url]);

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
