"use client";

import { useEffect, useState } from "react";

type Discovery = {
  id: string;
  foundAt: string;
  clue: { id: string; title: string; content: string; visibility: string };
};

type Announcement = { id: string; title: string; content: string };

type PlayState = {
  discoveries: Discovery[];
  announcements: Announcement[];
};

export default function PlayBoard({ initial }: { initial: PlayState }) {
  const [state, setState] = useState<PlayState>(initial);

  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const res = await fetch("/api/play/state", { cache: "no-store" });
        if (!res.ok) return;
        const data = await res.json();
        if (active) {
          setState({
            discoveries: data.discoveries,
            announcements: data.announcements,
          });
        }
      } catch {
        // ignore transient errors; next tick retries
      }
    }
    const interval = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-widest text-gold">
          Public announcements
        </h2>
        {state.announcements.length === 0 ? (
          <p className="text-sm text-muted">
            Nothing has been announced to the house yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {state.announcements.map((a) => (
              <li
                key={a.id}
                className="rounded-xl border border-gold/40 bg-surface p-4"
              >
                <h3 className="font-semibold text-gold">{a.title}</h3>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                  {a.content}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">
          Your clues ({state.discoveries.length})
        </h2>
        {state.discoveries.length === 0 ? (
          <p className="text-sm text-muted">
            You haven&apos;t found any clues yet. Explore the house and scan the
            QR codes you discover.
          </p>
        ) : (
          <ul className="flex flex-col gap-3">
            {state.discoveries.map((d) => (
              <li
                key={d.id}
                className="rounded-xl border border-border bg-surface p-4"
              >
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-foreground">
                    {d.clue.title}
                  </h3>
                  {d.clue.visibility === "PUBLIC" && (
                    <span className="rounded-full bg-gold/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-gold">
                      Public
                    </span>
                  )}
                </div>
                <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                  {d.clue.content}
                </p>
                <p className="mt-2 text-[11px] uppercase tracking-wider text-muted">
                  Found {new Date(d.foundAt).toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
