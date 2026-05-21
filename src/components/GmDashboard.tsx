"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type PhaseInfo = { n: number; name: string; durationMin: number | null; blurb: string; open: string[]; locked: string[] };
type Discovery = {
  id: string;
  shared: boolean;
  foundAt: string;
  character: { id: string; personaName: string; realName: string; avatarColor: string | null };
  clue: { id: string; code: string; title: string; tag: string; location: string; phase: number };
};
type Clue = { id: string; code: string; title: string; tag: string; phase: number; location: string; found: number };
type Character = { id: string; personaName: string; realName: string; role: string; avatarColor: string | null; found: number };
type LibraryItem = { id: string; kind: string; phase: number; title: string; body: string; isReleased: boolean };
type VoteRow = { round: number; accusedName: string; voter: string };

type GmState = {
  game: { name: string; status: string; currentPhase: number; activeVoteRound: number | null };
  phase: PhaseInfo;
  discoveries: Discovery[];
  clues: Clue[];
  characters: Character[];
  library: LibraryItem[];
  votes: VoteRow[];
};

const PHASE_NAMES = ["Arrival", "Discovery", "Suspicions", "Investigation", "Unmasking", "Architect", "Toast"];
const ROLE_COLOR: Record<string, string> = {
  KILLER: "text-accent",
  ACCOMPLICE: "text-gold",
  SINNER: "text-muted",
};

const TABS = ["Run", "Clues", "Suspects"] as const;
type Tab = (typeof TABS)[number];

export default function GmDashboard({ initial }: { initial: GmState }) {
  const [state, setState] = useState<GmState>(initial);
  const [tab, setTab] = useState<Tab>("Run");
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/gm/state", { cache: "no-store" });
      if (res.ok) setState(await res.json());
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const kick = setTimeout(refresh, 0);
    const t = setInterval(refresh, 4000);
    return () => {
      clearTimeout(kick);
      clearInterval(t);
    };
  }, [refresh]);

  async function setPhase(phase: number) {
    setBusy(`phase-${phase}`);
    try {
      await fetch("/api/gm/phase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function toggleReveal(item: LibraryItem) {
    setBusy(`rev-${item.id}`);
    try {
      await fetch(`/api/gm/announcement/${item.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ released: !item.isReleased }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  async function setVote(round: number | null) {
    setBusy(`vote-${round}`);
    try {
      await fetch("/api/gm/vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ round }),
      });
      await refresh();
    } finally {
      setBusy(null);
    }
  }

  const cur = state.game.currentPhase;
  const round = state.game.activeVoteRound;

  const tally = (r: number) => {
    const counts: Record<string, number> = {};
    for (const v of state.votes.filter((v) => v.round === r)) {
      counts[v.accusedName] = (counts[v.accusedName] ?? 0) + 1;
    }
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const autoReveals = state.library.filter((l) => l.kind === "AUTO_REVEAL");
  const solomon = state.library.filter((l) => l.kind === "SOLOMON");

  return (
    <div className="flex flex-col gap-5">
      {/* Phase stepper — always visible */}
      <section className="rounded-2xl border border-border bg-surface p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-muted">
            Current phase · {state.game.status.toLowerCase()}
          </p>
          <Link href="/gm/qr" className="text-xs font-semibold uppercase tracking-widest text-gold">QR codes →</Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PHASE_NAMES.map((name, n) => (
            <button
              key={n}
              onClick={() => setPhase(n)}
              disabled={busy === `phase-${n}`}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition disabled:opacity-50 ${
                n === cur ? "bg-accent text-white" : "border border-border bg-surface-2 text-muted hover:text-foreground"
              }`}
            >
              {n}. {name}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-muted">{state.phase.blurb}</p>
      </section>

      <nav className="flex gap-1 rounded-xl border border-border bg-surface p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide transition ${
              tab === t ? "bg-accent text-white" : "text-muted hover:text-foreground"
            }`}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Run" && (
        <div className="flex flex-col gap-5">
          {/* Voting */}
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Accusation ballots</h2>
            <div className="flex flex-wrap gap-2">
              {[4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setVote(round === r ? null : r)}
                  disabled={busy === `vote-${r}`}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold uppercase tracking-wide transition disabled:opacity-50 ${
                    round === r ? "bg-accent text-white" : "border border-border bg-surface-2 text-foreground hover:border-accent"
                  }`}
                >
                  {round === r ? `Close vote ${r}` : `Open vote ${r} (${r === 4 ? "killer" : "architect"})`}
                </button>
              ))}
            </div>
            {[4, 5].map((r) => {
              const t = tally(r);
              if (t.length === 0) return null;
              return (
                <div key={r} className="mt-3">
                  <p className="text-[11px] uppercase tracking-wider text-muted">Vote {r} tally</p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {t.map(([name, n]) => (
                      <li key={name} className="flex justify-between text-sm">
                        <span className="text-foreground">{name}</span>
                        <span className="font-semibold text-accent">{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </section>

          {/* Reveal library */}
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted">Scripted reveals</h2>
            <ul className="flex flex-col gap-2">
              {autoReveals.map((item) => (
                <li key={item.id} className="rounded-lg border border-border bg-surface-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted">{item.body}</p>
                    </div>
                    <button
                      onClick={() => toggleReveal(item)}
                      disabled={busy === `rev-${item.id}`}
                      className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-semibold uppercase tracking-wider transition disabled:opacity-50 ${
                        item.isReleased ? "bg-gold/20 text-gold" : "bg-accent text-white hover:bg-accent-soft"
                      }`}
                    >
                      {item.isReleased ? "Sent" : "Send"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <h3 className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-gold">🦜 Solomon lines</h3>
            <div className="flex flex-wrap gap-2">
              {solomon.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleReveal(item)}
                  disabled={busy === `rev-${item.id}`}
                  title={item.body}
                  className={`rounded-lg px-2.5 py-1.5 text-xs transition disabled:opacity-50 ${
                    item.isReleased ? "bg-gold/20 text-gold" : "border border-border bg-surface-2 text-foreground hover:border-gold"
                  }`}
                >
                  {item.body.length > 26 ? item.body.slice(0, 26) + "…" : item.body}
                </button>
              ))}
            </div>
          </section>

          {/* Live feed */}
          <section className="rounded-2xl border border-border bg-surface p-4">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-accent">Live discovery feed</h2>
            {state.discoveries.length === 0 ? (
              <p className="text-sm text-muted">No clues found yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.discoveries.slice(0, 40).map((d) => (
                  <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: d.character.avatarColor ?? "#7a1020" }}>
                      {d.character.personaName.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="font-semibold">{d.character.personaName}</span>
                        <span className="text-muted"> found </span>
                        <span className="font-mono text-xs text-muted">{d.clue.code}</span>{" "}
                        <span className="font-semibold">{d.clue.title}</span>
                        {d.clue.tag === "ANNOUNCE" && <span className="ml-1 rounded-full bg-accent/20 px-1.5 py-0.5 text-[10px] uppercase tracking-wider text-accent">announce</span>}
                        {d.shared && <span className="ml-1 text-[10px] uppercase tracking-wider text-gold">shared</span>}
                      </p>
                      <p className="text-[11px] uppercase tracking-wider text-muted">
                        {new Date(d.foundAt).toLocaleTimeString()} · {d.clue.location}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "Clues" && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          {[2, 3, 4, 5].map((p) => {
            const items = state.clues.filter((c) => c.phase === p);
            if (items.length === 0) return null;
            return (
              <div key={p} className="mb-4">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-widest text-gold">Phase {p}</h3>
                <ul className="flex flex-col gap-2">
                  {items.map((c) => (
                    <li key={c.id} className="rounded-lg border border-border bg-surface-2 px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm">
                            <span className="font-mono text-xs text-muted">{c.code}</span>{" "}
                            <span className="font-semibold">{c.title}</span>
                            <span className={`ml-2 rounded-full px-1.5 py-0.5 text-[10px] uppercase tracking-wider ${c.tag === "ANNOUNCE" ? "bg-accent/20 text-accent" : "bg-gold/20 text-gold"}`}>{c.tag.toLowerCase()}</span>
                          </p>
                          <p className="text-[11px] text-muted">{c.location}</p>
                        </div>
                        <span className="shrink-0 text-xs text-muted">{c.found} found</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </section>
      )}

      {tab === "Suspects" && (
        <section className="rounded-2xl border border-border bg-surface p-4">
          <ul className="flex flex-col gap-2">
            {state.characters.map((c) => (
              <li key={c.id} className="flex items-center gap-3 rounded-lg border border-border bg-surface-2 px-3 py-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: c.avatarColor ?? "#7a1020" }}>
                  {c.personaName.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{c.personaName}</p>
                  <p className="text-[11px] uppercase tracking-wider text-muted">
                    {c.realName} · <span className={ROLE_COLOR[c.role] ?? "text-muted"}>{c.role.toLowerCase()}</span> · {c.found} clues
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
