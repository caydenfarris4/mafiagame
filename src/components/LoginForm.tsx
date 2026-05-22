"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { DropLayer, Puddle, Wordmark } from "@/components/Atmosphere";
import { startAmbience, stopAmbience, isAmbienceOn, playDrip } from "@/lib/dripAudio";

const PUDDLE = 72;
type Mode = "choose" | "player" | "host";

export default function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("choose");
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [armed, setArmed] = useState(false);
  const [sound, setSound] = useState(false);
  const startedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setArmed(true), 500);
    return () => {
      clearTimeout(t);
      stopAmbience();
    };
  }, []);

  function armAudio() {
    if (!startedRef.current) {
      startedRef.current = true;
      startAmbience();
      setSound(isAmbienceOn());
    }
    playDrip(360 + Math.random() * 260);
  }

  function toggleSound() {
    if (isAmbienceOn()) {
      stopAmbience();
      setSound(false);
    } else {
      startedRef.current = true;
      startAmbience();
      setSound(true);
    }
  }

  function choose(m: Mode) {
    armAudio();
    setError(null);
    setCode("");
    setMode(m);
    setTimeout(() => inputRef.current?.focus(), 50);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    armAudio();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong.");
        setLoading(false);
        return;
      }
      // The host path is game-master only — reject a player code used there.
      if (mode === "host" && data.redirect !== "/gm") {
        await fetch("/api/auth/logout", { method: "POST" });
        setError("That isn't a game-master code.");
        setLoading(false);
        return;
      }
      router.push(next || data.redirect || "/play");
      router.refresh();
    } catch {
      setError("Network error. Try again.");
      setLoading(false);
    }
  }

  const host = mode === "host";
  const accent = host ? "var(--brass)" : "var(--cyan)";
  const accentBorder = host ? "var(--brass-dim)" : "var(--cyan-soft)";

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden" style={{ background: "#000" }}>
      <DropLayer intensity={4} puddleHeight={PUDDLE} showPuddle />
      <div className="fog" />
      <Puddle height={PUDDLE} />
      <div className="vignette" />
      <div className="grain" />

      <button
        onClick={toggleSound}
        aria-label={sound ? "Mute ambience" : "Play ambience"}
        className="absolute right-4 top-[max(1rem,env(safe-area-inset-top))] z-10 p-2 text-muted transition hover:text-cyan"
      >
        {sound ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 9v6h4l5 4V5L9 9H5z" />
            <path d="M16 8a5 5 0 010 8M18.5 5.5a9 9 0 010 13" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 9v6h4l5 4V5L9 9H5z" />
            <path d="M22 9l-6 6M16 9l6 6" />
          </svg>
        )}
      </button>

      <div className="relative z-[2] flex flex-1 flex-col items-center" style={{ padding: `90px 30px ${PUDDLE + 36}px` }}>
        <div
          className="font-mono"
          style={{
            fontSize: 9,
            letterSpacing: "0.38em",
            color: "var(--muted)",
            marginBottom: 34,
            opacity: armed ? 1 : 0,
            transition: "opacity 0.8s",
          }}
        >
          WHITFIELD LAKE HOUSE · GIG HARBOR
        </div>

        <div style={{ opacity: armed ? 1 : 0, transition: "opacity 1.2s ease-out" }}>
          <Wordmark size={50} />
        </div>

        <div className="min-h-9 flex-1" />

        <div
          className="w-full"
          style={{
            opacity: armed ? 1 : 0,
            transform: armed ? "translateY(0)" : "translateY(12px)",
            transition: "opacity 1.4s ease-out 0.5s, transform 1.4s ease-out 0.5s",
          }}
        >
          {mode === "choose" ? (
            <div className="flex flex-col gap-2.5">
              <button className="btn-primary w-full" onClick={() => choose("player")}>
                Enter a Game
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button className="btn-ghost btn-brass w-full" onClick={() => choose("host")}>
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <path d="M2 12V5l5-3 5 3v7M5 12V8h4v4" stroke="currentColor" strokeWidth="1.3" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Host as Game Master
              </button>
              <div className="font-mono text-center" style={{ fontSize: 9, letterSpacing: "0.28em", color: "var(--muted)", marginTop: 6 }}>
                <span style={{ color: "var(--text-dim)" }}>NINE</span> GUESTS · ONE KILLER
              </div>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="flex w-full flex-col gap-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => choose("choose")}
                  className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted transition hover:text-foreground"
                >
                  ← Back
                </button>
                <span className="eyebrow" style={{ color: accent }}>
                  {host ? "Game master" : "Player"}
                </span>
              </div>

              <label className="eyebrow mt-1 block text-center">
                {host ? "Game master code" : "Your character code"}
              </label>
              <input
                ref={inputRef}
                value={code}
                onFocus={armAudio}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder={host ? "GM-ALEX" : "HANK-01"}
                autoComplete="off"
                autoCapitalize="characters"
                className="w-full border bg-surface px-4 py-4 text-center font-mono text-2xl tracking-[0.18em] outline-none transition"
                style={{ borderColor: code ? accentBorder : "var(--border)", color: accent, caretColor: accent }}
              />

              {error && (
                <p className="border border-blood-dim bg-[rgba(168,71,79,0.08)] px-3 py-2 text-center text-sm text-foreground">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || code.trim() === ""}
                className="btn-primary w-full"
                style={host && code.trim() !== "" && !loading ? { background: "var(--brass)", color: "var(--abyss)" } : undefined}
              >
                {loading ? "Entering…" : host ? "Open the Director's View" : "Enter the house"}
                <svg width="14" height="14" viewBox="0 0 14 14">
                  <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
