"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// The game server's WebSocket. By default it's same-origin (/ws) — the
// Cloudflare Worker that serves this UI also handles /ws. Override with
// NEXT_PUBLIC_GAME_WS_URL only if you run the worker on a different host.
function wsBase(): string {
  const explicit = process.env.NEXT_PUBLIC_GAME_WS_URL;
  if (explicit) return explicit;
  if (typeof window === "undefined") return "ws://localhost:8787/ws";
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws`;
}

export type GameState = Record<string, unknown> & {
  view?: "tv" | "player";
  stage?: string;
};

type Status = "connecting" | "open" | "closed";

type Options = {
  /** "tv" hosts a room; "player" joins one. */
  role: "tv" | "player";
  /** Required for players; for the TV it's discovered after the room is created. */
  code?: string;
  /** Sent (via the provided sender) as soon as the socket opens. */
  onOpen?: (send: (msg: object) => void) => void;
  /** Non-state control messages (e.g. { type: "joined" }, { type: "error" }). */
  onMessage?: (msg: Record<string, unknown>, send: (msg: object) => void) => void;
};

/**
 * One resilient WebSocket to the game server. Surfaces the latest per-viewer
 * state object, a connection status, and the last server error. Auto-reconnects
 * with backoff; once the TV learns its room code it reconnects to the *same*
 * room rather than creating a new one.
 */
export function useGame({ role, code, onOpen, onMessage }: Options) {
  const [state, setState] = useState<GameState | null>(null);
  const [status, setStatus] = useState<Status>("connecting");
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const retryRef = useRef(0);
  const closedRef = useRef(false);
  // The room code to reconnect to. Players have it up front; the TV fills it in
  // once the server reports the created room's code.
  const codeRef = useRef<string | undefined>(code);
  const cbRef = useRef<Options>({ role, code, onOpen, onMessage });
  useEffect(() => {
    cbRef.current = { role, code, onOpen, onMessage };
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
      const params = new URLSearchParams({ role });
      if (codeRef.current) params.set("code", codeRef.current);
      const ws = new WebSocket(`${wsBase()}?${params.toString()}`);
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
          if (typeof msg.roomCode === "string") codeRef.current = msg.roomCode;
          setState(msg as GameState);
          return;
        }
        if (typeof msg.roomCode === "string") codeRef.current = msg.roomCode;
        if (msg.type === "error") setError(String(msg.message ?? "Something went wrong."));
        cbRef.current.onMessage?.(msg, send);
      };
      ws.onclose = () => {
        setStatus("closed");
        if (closedRef.current) return;
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
    // role is stable for a given page; code changes are tracked via codeRef.
  }, [role, send]);

  return { state, status, error, send, clearError: () => setError(null) };
}
