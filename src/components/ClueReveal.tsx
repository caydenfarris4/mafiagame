"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Revealed = {
  title: string;
  content: string;
  visibility: string;
  alreadyFound: boolean;
};

export default function ClueReveal({ token }: { token: string }) {
  const [clue, setClue] = useState<Revealed | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(
          `/api/clue/${encodeURIComponent(token)}/discover`,
          { method: "POST" },
        );
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
        <Link
          href="/play"
          className="mt-4 inline-block text-sm uppercase tracking-widest text-gold"
        >
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

  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-2xl">
      {clue.alreadyFound && (
        <p className="mb-3 text-[11px] uppercase tracking-widest text-muted">
          You already found this one
        </p>
      )}
      <h1 className="text-2xl font-bold text-foreground">{clue.title}</h1>
      {clue.visibility === "PUBLIC" && (
        <span className="mt-2 inline-block rounded-full bg-gold/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
          Public clue
        </span>
      )}
      <p className="mt-4 whitespace-pre-wrap leading-relaxed text-foreground">
        {clue.content}
      </p>

      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <span className="text-xs text-muted">Saved to your dossier.</span>
        <Link
          href="/play"
          className="text-sm font-semibold uppercase tracking-widest text-gold"
        >
          My clues →
        </Link>
      </div>
    </div>
  );
}
