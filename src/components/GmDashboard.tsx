"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Discovery = {
  id: string;
  foundAt: string;
  character: {
    id: string;
    name: string;
    realName: string | null;
    avatarColor: string | null;
  };
  clue: {
    id: string;
    title: string;
    visibility: string;
    location: string | null;
  };
};

type Clue = {
  id: string;
  title: string;
  location: string | null;
  visibility: string;
  isReleased: boolean;
  _count: { discoveries: number };
};

type Character = {
  id: string;
  name: string;
  realName: string | null;
  role: string;
  isAlive: boolean;
  avatarColor: string | null;
  _count: { discoveries: number };
};

type GmState = {
  discoveries: Discovery[];
  clues: Clue[];
  characters: Character[];
};

export default function GmDashboard({ initial }: { initial: GmState }) {
  const [state, setState] = useState<GmState>(initial);
  const [busyClueId, setBusyClueId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/gm/state", { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {
      // ignore transient errors
    }
  }, []);

  useEffect(() => {
    const interval = setInterval(refresh, 4000);
    return () => clearInterval(interval);
  }, [refresh]);

  async function toggleRelease(clue: Clue) {
    setBusyClueId(clue.id);
    try {
      await fetch(`/api/gm/clue/${clue.id}/release`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ released: !clue.isReleased }),
      });
      await refresh();
    } finally {
      setBusyClueId(null);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-accent">
            Live discovery feed
          </h2>
          <span className="text-[11px] uppercase tracking-wider text-muted">
            auto-refreshing
          </span>
        </div>
        {state.discoveries.length === 0 ? (
          <p className="text-sm text-muted">No clues found yet.</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {state.discoveries.map((d) => (
              <li
                key={d.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: d.character.avatarColor ?? "#7a1020" }}
                >
                  {d.character.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">
                    <span className="font-semibold">{d.character.name}</span>
                    <span className="text-muted"> found </span>
                    <span className="font-semibold">{d.clue.title}</span>
                    {d.clue.visibility === "PUBLIC" && (
                      <span className="ml-2 rounded-full bg-gold/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-gold">
                        public
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] uppercase tracking-wider text-muted">
                    {new Date(d.foundAt).toLocaleTimeString()}
                    {d.clue.location ? ` · ${d.clue.location}` : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-6">
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted">
              Clues
            </h2>
            <Link
              href="/gm/qr"
              className="text-xs font-semibold uppercase tracking-widest text-gold"
            >
              QR codes →
            </Link>
          </div>
          <ul className="flex flex-col gap-2">
            {state.clues.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-border bg-surface px-3 py-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.title}</p>
                    <p className="text-[11px] uppercase tracking-wider text-muted">
                      {c.visibility.toLowerCase()}
                      {c.location ? ` · ${c.location}` : ""} ·{" "}
                      {c._count.discoveries} found
                    </p>
                  </div>
                  {c.visibility === "PUBLIC" ? (
                    <button
                      onClick={() => toggleRelease(c)}
                      disabled={busyClueId === c.id}
                      className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50 ${
                        c.isReleased
                          ? "bg-gold/20 text-gold hover:bg-gold/30"
                          : "bg-surface-2 text-muted hover:text-foreground"
                      }`}
                    >
                      {c.isReleased ? "Released" : "Release"}
                    </button>
                  ) : (
                    <span className="shrink-0 text-[11px] uppercase tracking-wider text-muted">
                      secret
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
            Suspects
          </h2>
          <ul className="flex flex-col gap-2">
            {state.characters.map((c) => (
              <li
                key={c.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2"
              >
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ background: c.avatarColor ?? "#7a1020" }}
                >
                  {c.name.charAt(0).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {c.name}
                    {!c.isAlive && (
                      <span className="ml-2 text-[11px] uppercase tracking-wider text-accent">
                        eliminated
                      </span>
                    )}
                  </p>
                  <p className="text-[11px] uppercase tracking-wider text-muted">
                    {c.realName ? `${c.realName} · ` : ""}
                    {c.role.toLowerCase()} · {c._count.discoveries} clues
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
