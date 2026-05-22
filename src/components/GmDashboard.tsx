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
type Character = { id: string; personaName: string; realName: string; role: string; loginCode: string; avatarColor: string | null; found: number };
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
  KILLER: "var(--blood)",
  ACCOMPLICE: "var(--brass)",
  SINNER: "var(--muted)",
};
const TABS = ["Run", "Clues", "Suspects"] as const;
type Tab = (typeof TABS)[number];

function avatarBg(color: string | null) {
  const c = color ?? "#7a3338";
  return `repeating-linear-gradient(135deg, ${c}, ${c} 4px, color-mix(in oklch, ${c}, black 25%) 4px, color-mix(in oklch, ${c}, black 25%) 8px)`;
}

export default function GmDashboard({ initial }: { initial: GmState }) {
  const [state, setState] = useState<GmState>(initial);
  const [tab, setTab] = useState<Tab>("Run");
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* clipboard unavailable */
    }
  }

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
    for (const v of state.votes.filter((v) => v.round === r)) counts[v.accusedName] = (counts[v.accusedName] ?? 0) + 1;
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const autoReveals = state.library.filter((l) => l.kind === "AUTO_REVEAL");
  const solomon = state.library.filter((l) => l.kind === "SOLOMON");

  return (
    <div className="flex flex-col gap-4">
      {/* Phase control — always visible */}
      <div className="card-noir p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="eyebrow" style={{ color: "var(--brass)" }}>
            Phase control · {state.game.status.toLowerCase()}
          </p>
          <Link href="/gm/qr" className="font-mono text-[11px] uppercase tracking-[0.2em] text-cyan">
            QR codes →
          </Link>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {PHASE_NAMES.map((name, n) => (
            <button
              key={n}
              onClick={() => setPhase(n)}
              disabled={busy === `phase-${n}`}
              className="px-2.5 py-1.5 font-mono text-[11px] transition disabled:opacity-50"
              style={{
                border: `1px solid ${n === cur ? "var(--cyan-soft)" : "var(--border)"}`,
                background: n === cur ? "var(--cyan)" : "var(--surface)",
                color: n === cur ? "var(--abyss)" : n < cur ? "var(--text-dim)" : "var(--muted)",
              }}
            >
              {n}. {name}
            </button>
          ))}
        </div>
        <p className="mt-3 text-sm text-text-dim" style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>
          {state.phase.blurb}
        </p>
      </div>

      <nav className="card-noir flex gap-1 p-1">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="flex-1 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.18em] transition"
            style={{
              color: tab === t ? "var(--abyss)" : "var(--muted)",
              background: tab === t ? "var(--brass)" : "transparent",
            }}
          >
            {t}
          </button>
        ))}
      </nav>

      {tab === "Run" && (
        <div className="flex flex-col gap-4">
          {/* Voting */}
          <div className="card-noir p-4">
            <p className="eyebrow mb-3" style={{ color: "var(--blood)" }}>
              Accusation ballots
            </p>
            <div className="flex flex-wrap gap-2">
              {[4, 5].map((r) => (
                <button
                  key={r}
                  onClick={() => setVote(round === r ? null : r)}
                  disabled={busy === `vote-${r}`}
                  className="btn-ghost disabled:opacity-50"
                  style={round === r ? { borderColor: "var(--blood)", color: "var(--blood)" } : undefined}
                >
                  {round === r ? `Close vote ${r}` : `Open vote ${r} · ${r === 4 ? "killer" : "architect"}`}
                </button>
              ))}
            </div>
            {[4, 5].map((r) => {
              const t = tally(r);
              if (t.length === 0) return null;
              return (
                <div key={r} className="mt-3">
                  <p className="eyebrow">Vote {r} tally</p>
                  <ul className="mt-1 flex flex-col gap-1">
                    {t.map(([name, n]) => (
                      <li key={name} className="flex justify-between text-sm">
                        <span className="text-foreground">{name}</span>
                        <span className="font-mono text-blood">{n}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>

          {/* Reveal library */}
          <div className="card-noir p-4">
            <p className="eyebrow mb-3">Scripted reveals</p>
            <ul className="flex flex-col gap-2">
              {autoReveals.map((item) => (
                <li key={item.id} className="border border-border bg-surface p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-0.5 text-xs text-muted" style={{ fontFamily: "var(--font-display)" }}>
                        {item.body}
                      </p>
                    </div>
                    <button
                      onClick={() => toggleReveal(item)}
                      disabled={busy === `rev-${item.id}`}
                      className="shrink-0 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] transition disabled:opacity-50"
                      style={
                        item.isReleased
                          ? { background: "rgba(196,167,113,0.18)", color: "var(--brass)" }
                          : { background: "var(--cyan)", color: "var(--abyss)" }
                      }
                    >
                      {item.isReleased ? "Sent" : "Send"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
            <p className="eyebrow mb-2 mt-4" style={{ color: "var(--brass)" }}>
              🦜 Solomon lines
            </p>
            <div className="flex flex-wrap gap-2">
              {solomon.map((item) => (
                <button
                  key={item.id}
                  onClick={() => toggleReveal(item)}
                  disabled={busy === `rev-${item.id}`}
                  title={item.body}
                  className="px-2.5 py-1.5 text-xs transition disabled:opacity-50"
                  style={{
                    border: `1px solid ${item.isReleased ? "var(--brass-dim)" : "var(--border)"}`,
                    background: item.isReleased ? "rgba(196,167,113,0.12)" : "var(--surface)",
                    color: item.isReleased ? "var(--brass)" : "var(--text)",
                  }}
                >
                  {item.body.length > 26 ? item.body.slice(0, 26) + "…" : item.body}
                </button>
              ))}
            </div>
          </div>

          {/* Live feed */}
          <div className="card-noir p-4">
            <p className="eyebrow mb-3" style={{ color: "var(--cyan)" }}>
              Live discovery feed
            </p>
            {state.discoveries.length === 0 ? (
              <p className="text-sm text-muted">No clues found yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {state.discoveries.slice(0, 40).map((d) => (
                  <li key={d.id} className="flex items-center gap-3 border border-border bg-surface px-3 py-2">
                    <span
                      className="flex h-8 w-8 shrink-0 items-center justify-center font-mono text-xs text-foreground"
                      style={{ background: avatarBg(d.character.avatarColor) }}
                    >
                      {d.character.personaName.charAt(0)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm">
                        <span className="font-medium">{d.character.personaName}</span>
                        <span className="text-muted"> found </span>
                        <span className="font-mono text-xs text-cyan">{d.clue.code}</span>{" "}
                        <span className="font-medium">{d.clue.title}</span>
                        {d.clue.tag === "ANNOUNCE" && (
                          <span className="ml-1 font-mono text-[10px] uppercase tracking-wider text-cyan">· announce</span>
                        )}
                        {d.shared && <span className="ml-1 font-mono text-[10px] uppercase tracking-wider text-brass">· shared</span>}
                      </p>
                      <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                        {new Date(d.foundAt).toLocaleTimeString()} · {d.clue.location}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {tab === "Clues" && (
        <div className="card-noir p-4">
          {[2, 3, 4, 5].map((p) => {
            const items = state.clues.filter((c) => c.phase === p);
            if (items.length === 0) return null;
            return (
              <div key={p} className="mb-4">
                <p className="eyebrow mb-2" style={{ color: "var(--cyan)" }}>
                  Phase {p}
                </p>
                <ul className="flex flex-col gap-2">
                  {items.map((c) => (
                    <li key={c.id} className="border border-border bg-surface px-3 py-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm">
                            <span className="font-mono text-xs text-muted">{c.code}</span>{" "}
                            <span className="font-medium">{c.title}</span>
                            <span
                              className="ml-2 font-mono text-[10px] uppercase tracking-wider"
                              style={{ color: c.tag === "ANNOUNCE" ? "var(--cyan)" : "var(--brass)" }}
                            >
                              {c.tag.toLowerCase()}
                            </span>
                          </p>
                          <p className="text-[11px] text-muted">{c.location}</p>
                        </div>
                        <span className="shrink-0 font-mono text-xs text-muted">{c.found} found</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}

      {tab === "Suspects" && (
        <div className="card-noir p-4">
          <p className="eyebrow" style={{ color: "var(--brass)" }}>
            Cast &amp; codes · hand each guest their code
          </p>
          <p className="mb-3 mt-1 text-sm text-text-dim" style={{ fontFamily: "var(--font-display)", fontStyle: "italic" }}>
            Each person signs in at the home screen with their own code. Tap a code to copy it.
          </p>
          <ul className="flex flex-col gap-2">
            {state.characters.map((c) => (
              <li key={c.id} className="flex items-center gap-3 border border-border bg-surface px-3 py-2">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center font-mono text-xs text-foreground"
                  style={{ background: avatarBg(c.avatarColor) }}
                >
                  {c.personaName.charAt(0)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{c.personaName}</p>
                  <p className="font-mono text-[11px] uppercase tracking-wider text-muted">
                    {c.realName} · <span style={{ color: ROLE_COLOR[c.role] ?? "var(--muted)" }}>{c.role.toLowerCase()}</span> · {c.found} clues
                  </p>
                </div>
                <button
                  onClick={() => copyCode(c.loginCode)}
                  title="Copy code"
                  className="shrink-0 border border-border px-2.5 py-1 font-mono text-xs tracking-[0.12em] text-cyan transition hover:border-cyan-soft"
                >
                  {copied === c.loginCode ? "✓ copied" : c.loginCode}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
