"use client";

import { useCallback, useEffect, useState } from "react";

type Section = { heading: string; body: string };
type Clue = { id: string; code: string; title: string; content: string; tag: string };
type Discovery = { id: string; shared: boolean; foundAt: string; clue: Clue };
type Announcement = { id: string; kind: string; title: string; body: string; releasedAt: string };
type PhaseInfo = {
  n: number;
  name: string;
  durationMin: number | null;
  blurb: string;
  open: string[];
  locked: string[];
};

type PlayState = {
  game: { name: string; status: string; currentPhase: number; activeVoteRound: number | null };
  phase: PhaseInfo;
  discoveries: Discovery[];
  announcements: Announcement[];
  myVote: { accusedName: string } | null;
  candidates: string[];
};

type Props = {
  prop: string | null;
  sheet: Section[];
  lastNight: Section[];
  initial: PlayState;
};

const TABS = ["Dossier", "Last Night", "This Phase", "My Clues", "Feed"] as const;
type Tab = (typeof TABS)[number];

function Sections({ sections }: { sections: Section[] }) {
  return (
    <div className="flex flex-col gap-4">
      {sections.map((s, i) => (
        <div key={i}>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">{s.heading}</h3>
          <p className="mt-1 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{s.body}</p>
        </div>
      ))}
    </div>
  );
}

export default function PlayBoard({ prop, sheet, lastNight, initial }: Props) {
  const [tab, setTab] = useState<Tab>("Dossier");
  const [state, setState] = useState<PlayState>(initial);
  const [sharing, setSharing] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/play/state", { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {
      /* ignore transient errors */
    }
  }, []);

  useEffect(() => {
    const kick = setTimeout(refresh, 0);
    const t = setInterval(refresh, 5000);
    return () => {
      clearTimeout(kick);
      clearInterval(t);
    };
  }, [refresh]);

  async function share(clueId: string) {
    setSharing(clueId);
    try {
      await fetch("/api/play/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clueId }),
      });
      await refresh();
    } finally {
      setSharing(null);
    }
  }

  async function castVote(name: string) {
    await fetch("/api/play/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accusedName: name }),
    });
    await refresh();
  }

  const round = state.game.activeVoteRound;

  return (
    <div className="flex flex-col gap-5">
      {round && (
        <div className="rounded-xl border border-accent bg-accent/10 p-4">
          <p className="text-sm font-semibold uppercase tracking-widest text-accent">
            {round === 4 ? "Vote: who killed Richard?" : "Vote: who was the architect?"}
          </p>
          <p className="mt-1 text-xs text-muted">
            {state.myVote ? `Your ballot: ${state.myVote.accusedName}. You can change it.` : "Cast your ballot."}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {state.candidates.map((c) => (
              <button
                key={c}
                onClick={() => castVote(c)}
                className={`rounded-lg px-3 py-1.5 text-sm transition ${
                  state.myVote?.accusedName === c
                    ? "bg-accent text-white"
                    : "border border-border bg-surface-2 text-foreground hover:border-accent"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      )}

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-border bg-surface p-1">
        {TABS.map((t) => {
          const badge =
            t === "My Clues"
              ? state.discoveries.length
              : t === "Feed"
                ? state.announcements.length
                : null;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 whitespace-nowrap rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
                tab === t ? "bg-accent text-white" : "text-muted hover:text-foreground"
              }`}
            >
              {t}
              {badge ? <span className="ml-1 opacity-70">{badge}</span> : null}
            </button>
          );
        })}
      </nav>

      <div className="rounded-2xl border border-border bg-surface p-5">
        {tab === "Dossier" && (
          <div className="flex flex-col gap-4">
            <Sections sections={sheet} />
            {prop && (
              <div className="rounded-lg border border-border bg-surface-2 p-3">
                <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Your prop</h3>
                <p className="mt-1 text-sm text-foreground">{prop}</p>
              </div>
            )}
          </div>
        )}

        {tab === "Last Night" && (
          <div>
            <h2 className="mb-3 text-lg font-bold">The Last Night</h2>
            <Sections sections={lastNight} />
          </div>
        )}

        {tab === "This Phase" && (
          <div className="flex flex-col gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted">
                Phase {state.phase.n}
                {state.phase.durationMin ? ` · ~${state.phase.durationMin} min` : ""}
              </p>
              <h2 className="text-xl font-bold">{state.phase.name}</h2>
              <p className="mt-1 text-sm text-muted">{state.phase.blurb}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-widest text-gold">Open to search</h3>
              <ul className="mt-1 flex flex-wrap gap-2">
                {state.phase.open.map((r) => (
                  <li key={r} className="rounded-full bg-surface-2 px-3 py-1 text-sm text-foreground">{r}</li>
                ))}
              </ul>
            </div>
            {state.phase.locked.length > 0 && (
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">Still locked</h3>
                <ul className="mt-1 flex flex-wrap gap-2">
                  {state.phase.locked.map((r) => (
                    <li key={r} className="rounded-full border border-border px-3 py-1 text-sm text-muted">{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {tab === "My Clues" && (
          <div>
            <h2 className="mb-3 text-lg font-bold">Your clues ({state.discoveries.length})</h2>
            {state.discoveries.length === 0 ? (
              <p className="text-sm text-muted">
                Nothing yet. Explore the open rooms and scan the QR codes you find.
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {state.discoveries.map((d) => {
                  const keep = d.clue.tag === "KEEP";
                  return (
                    <li key={d.id} className="rounded-xl border border-border bg-surface-2 p-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded bg-surface px-2 py-0.5 font-mono text-xs text-muted">{d.clue.code}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wider ${keep ? "bg-gold/20 text-gold" : "bg-accent/20 text-accent"}`}>
                          {keep ? "Keep" : "Announce"}
                        </span>
                        {d.shared && <span className="text-[10px] uppercase tracking-wider text-muted">shared</span>}
                      </div>
                      <h3 className="mt-1 font-semibold text-foreground">{d.clue.title}</h3>
                      <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{d.clue.content}</p>
                      {keep && !d.shared && (
                        <button
                          onClick={() => share(d.clue.id)}
                          disabled={sharing === d.clue.id}
                          className="mt-3 rounded-lg bg-gold/20 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gold transition hover:bg-gold/30 disabled:opacity-50"
                        >
                          {sharing === d.clue.id ? "Sharing…" : "Share with the house"}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {tab === "Feed" && (
          <div>
            <h2 className="mb-3 text-lg font-bold">The house feed</h2>
            {state.announcements.length === 0 ? (
              <p className="text-sm text-muted">Nothing has been announced to the house yet.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {state.announcements.map((a) => (
                  <li key={a.id} className={`rounded-xl border p-4 ${a.kind === "SOLOMON" ? "border-gold/50 bg-gold/5" : "border-border bg-surface-2"}`}>
                    <h3 className={`font-semibold ${a.kind === "SOLOMON" ? "text-gold" : "text-foreground"}`}>
                      {a.kind === "SOLOMON" ? "🦜 Solomon" : a.title}
                    </h3>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{a.body}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
