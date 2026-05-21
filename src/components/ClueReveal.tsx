"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Revealed = {
  code: string;
  title: string;
  content: string;
  tag: string;
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

  if (error) {
    return (
      <div className="rounded-2xl border border-accent-soft bg-surface p-6 text-center">
        <p className="text-foreground">{error}</p>
        <Link href="/play" className="mt-4 inline-block text-sm uppercase tracking-widest text-gold">
          Back to your dossier
        </Link>
      </div>
    );
  }

  if (!clue) {
    return (
      <div className="rounded-2xl border border-border bg-surface p-8 text-center">
        <p className="animate-pulse text-muted">Revealing the clue…</p>
      </div>
    );
  }

  const announce = clue.tag === "ANNOUNCE";

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xl">
      {clue.alreadyFound && (
        <p className="mb-3 text-[11px] uppercase tracking-widest text-muted">
          You already found this one
        </p>
      )}
      <div className="flex items-center gap-2">
        <span className="rounded bg-surface-2 px-2 py-0.5 font-mono text-xs text-muted">
          {clue.code}
        </span>
        <span
          className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${
            announce ? "bg-accent/20 text-accent" : "bg-gold/20 text-gold"
          }`}
        >
          {announce ? "Announce" : "Keep"}
        </span>
      </div>
      <h1 className="mt-2 text-2xl font-bold text-foreground">{clue.title}</h1>
      <p className="mt-4 whitespace-pre-wrap leading-relaxed text-foreground">{clue.content}</p>

      <div className="mt-5 rounded-lg border border-border bg-surface-2 p-3 text-sm text-muted">
        {announce ? (
          <>This is an <span className="text-accent">ANNOUNCE</span> clue — read it aloud to the room. It has been posted to everyone&apos;s feed.</>
        ) : (
          <>This is a <span className="text-gold">KEEP</span> clue — yours to hold or share. The game master has been notified that you found it. You can share it from your dossier.</>
        )}
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-muted">Saved to your dossier.</span>
        <Link href="/play" className="text-sm font-semibold uppercase tracking-widest text-gold">
          My dossier →
        </Link>
      </div>
    </div>
  );
}
