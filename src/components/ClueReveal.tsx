"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Atmosphere, Bracketed } from "@/components/Atmosphere";

type Revealed = {
  code: string;
  title: string;
  content: string;
  tag: string;
  image: string | null;
  alreadyFound: boolean;
};

export default function ClueReveal({ token }: { token: string }) {
  const [clue, setClue] = useState<Revealed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/clue/${encodeURIComponent(token)}/discover`, {
          method: "POST",
        });
        const data = await res.json();
        if (!active) return;
        if (!res.ok) {
          setError(data.error ?? "This clue could not be opened.");
          return;
        }
        setClue(data);
      } catch {
        if (active) setError("Network error. Try scanning again.");
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const announce = clue?.tag === "ANNOUNCE";

  return (
    <main className="relative flex min-h-dvh flex-col overflow-hidden bg-abyss">
      <Atmosphere intensity={1} tide />
      <div className="relative z-[2] mx-auto flex w-full max-w-md flex-1 flex-col justify-center p-6">
        {error ? (
          <div className="card-noir p-6 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-blood">Evidence locked</p>
            <p className="mt-3 text-foreground">{error}</p>
            <Link href="/play" className="mt-5 inline-block font-mono text-xs uppercase tracking-[0.22em] text-cyan">
              ← Back to your dossier
            </Link>
          </div>
        ) : !clue ? (
          <div className="card-noir p-10 text-center">
            <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">◆ Evidence located · decoding</p>
            <p className="mt-3 animate-pulse text-muted">Revealing the clue…</p>
          </div>
        ) : (
          <Bracketed brass={!announce}>
            <div className="card-noir p-6" style={announce ? undefined : { background: "rgba(196,167,113,0.04)" }}>
              {clue.alreadyFound && (
                <p className="eyebrow mb-3">You already logged this one</p>
              )}
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs tracking-[0.16em] text-cyan">◆ CLUE {clue.code}</span>
                <span
                  className={`pill ${announce ? "pill-live" : "pill-brass"}`}
                  style={{ marginLeft: "auto" }}
                >
                  {announce ? "Announce" : "Keep"}
                </span>
              </div>
              <h1 className="display mt-3 text-3xl leading-tight text-foreground">{clue.title}</h1>
              {clue.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={clue.image}
                  alt={clue.title}
                  className="mt-4 w-full border border-border"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).style.display = "none";
                  }}
                />
              )}
              <p
                className="mt-4 whitespace-pre-wrap leading-relaxed text-text-dim"
                style={{ fontFamily: "var(--font-display)", fontSize: 15 }}
              >
                {clue.content}
              </p>

              <div className="mt-5 border-t border-border pt-4 text-sm text-muted">
                {announce ? (
                  <>
                    <span className="text-cyan">ANNOUNCE</span> — read it aloud. It&apos;s been posted to the
                    house feed.
                  </>
                ) : (
                  <>
                    <span className="text-brass">KEEP</span> — yours to hold or share. The game master has been
                    notified. Share it from your dossier.
                  </>
                )}
              </div>

              <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                <span className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted">
                  Logged to your dossier
                </span>
                <Link href="/play" className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
                  My dossier →
                </Link>
              </div>
            </div>
          </Bracketed>
        )}
      </div>
    </main>
  );
}
