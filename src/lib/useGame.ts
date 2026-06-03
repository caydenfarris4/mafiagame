"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The Python game server's WebSocket. Override per-environment with
// NEXT_PUBLIC_GAME_WS_URL (e.g. ws://localhost:8000/ws in dev).
function resolveWsUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_GAME_WS_URL;
  if (explicit) return explicit;
  if (typeof window === "undefined") return "ws://localhost:8000/ws";
  // Same-host fallback: assume the server is reachable at /ws on this origin
  // (e.g. behind a reverse proxy in production).
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

export type GameState = Record<string, unknown> & {
  view?: "tv" | "player";
  stage?: string;
};

type Status = "connecting" | "open" | "closed";

type Options = {
  /** Sent (via the provided sender) as soon as the socket opens. */
  onOpen?: (send: (msg: object) => void) => void;
  /** Non-state control messages (e.g. { type: "joined" }, { type: "error" }). */
  onMessage?: (msg: Record<string, unknown>, send: (msg: object) => void) => void;
};

/**
 * One resilient WebSocket to the game server. Surfaces the latest per-viewer
 * state object, a coarse connection status, and the last server error. Auto-
 * reconnects with backoff and replays `onOpen` so a dropped TV/phone rejoins.
 */
export function useGame({ onOpen, onMessage }: Options = {}) {
  const [state, setState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const closedRef = useRef(false);
  // Keep the latest callbacks without forcing a reconnect when they change.
  const cbRef = useRef<Options>({ onOpen, onMessage });
  useEffect(() => {
    cbRef.current = { onOpen, onMessage };
  });

  const send = useCallback((msg: object) => {
    const ws = wsRef.current;
    if (ws && ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(msg));
  }, []);

  useEffect(() => {
    closedRef.current = false;
    let reconnectTimer: ReturnType<typeof setTimeout>;

    const connect = () => {
      setStatus("connecting");
      const ws = new WebSocket(resolveWsUrl());
      wsRef.current = ws;

      ws.onopen = () => {
        retryRef.current = 0;
        setStatus("open");
        setError(null);
        cbRef.current.onOpen?.(send);
      };
      ws.onmessage = (ev) => {
        let msg: Record<string, unknown>;
        try {
          msg = JSON.parse(ev.data);
        } catch {
          return;
        }
        if (msg.view === "tv" || msg.view === "player") {
          setState(msg as GameState);
          return;
        }
        if (msg.type === "error") setError(String(msg.message ?? "Something went wrong."));
        cbRef.current.onMessage?.(msg, send);
      };
      ws.onclose = () => {
        setStatus("closed");
        if (closedRef.current) return;
        // Exponential backoff capped at 8s.
        const delay = Math.min(8000, 500 * 2 ** retryRef.current++);
        reconnectTimer = setTimeout(connect, delay);
      };
      ws.onerror = () => ws.close();
    };

    connect();
    return () => {
      closedRef.current = true;
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [send]);

  return { state, status, error, send, clearError: () => setError(null) };
}
