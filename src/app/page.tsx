"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Atmosphere, Bracketed, Wordmark } from "@/components/Atmosphere";

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState("");

  const join = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim().toUpperCase();
    if (clean.length === 4) router.push(`/play?code=${clean}`);
  };

  return (
    <main className="relative flex min-h-full flex-col items-center justify-center overflow-hidden px-6 py-16">
      <Atmosphere intensity={3} />
      <div className="relative z-10 w-full max-w-md">
        <Wordmark size={64} />

        <p className="mt-8 text-center text-sm leading-relaxed text-text-dim">
          A 30-minute social deduction party game for 4–10 players. One of you is
          a murderer. Find them before the police arrive.
        </p>

        <Bracketed className="mt-10 p-6" brass>
          <a
            href="/tv"
            className="block w-full rounded-md bg-cyan/15 py-4 text-center font-mono text-sm uppercase tracking-[0.22em] text-cyan transition-colors hover:bg-cyan/25"
          >
            Host on this screen
          </a>
          <p className="mt-2 text-center text-xs text-muted-2">
            Open on a TV or shared screen. Players join from their phones.
          </p>

          <div className="my-6 flex items-center gap-3 text-muted-2">
            <span className="h-px flex-1 bg-border" />
            <span className="font-mono text-[10px] uppercase tracking-[0.3em]">or join</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={join} className="space-y-3">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().slice(0, 4))}
              placeholder="ROOM CODE"
              maxLength={4}
              autoCapitalize="characters"
              autoComplete="off"
              className="w-full rounded-md border border-border bg-surface py-4 text-center font-mono text-2xl uppercase tracking-[0.5em] text-text placeholder:text-muted-2 focus:border-cyan focus:outline-none"
            />
            <button
              type="submit"
              disabled={code.trim().length !== 4}
              className="w-full rounded-md bg-brass/20 py-4 font-mono text-sm uppercase tracking-[0.22em] text-brass transition-colors hover:bg-brass/30 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Join the game
            </button>
          </form>
        </Bracketed>
      </div>
    </main>
  );
}
