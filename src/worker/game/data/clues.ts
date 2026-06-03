// The clue bank — INTENTIONALLY EMPTY.
//
// The GDD calls for 40–60 hand-crafted clues per character × scenario combo,
// each tagged with one of three types:
//   - "noise"    — sounds relevant, leads nowhere.
//   - "redirect" — true info that points at an innocent player.
//   - "thread"   — subtly implicates the murderer; only damning in combination.
//
// This file ships the *type, the empty array, and the selection rules* only.
// Until you add clues the engine fabricates "[PLACEHOLDER]" clues so the round
// structure and type ratios can be exercised before real content exists.
//
// To add clues: push objects into CLUE_BANK below. Each clue is keyed to a
// character and optionally scoped to a death location / time of death. Example:
//
//   { characterKey: "marcus_vale", type: "thread",
//     text: "Marcus's car left the boathouse road just after midnight.",
//     location: "boathouse", timeOfDeath: "midnight" },
//   { characterKey: "marcus_vale", type: "redirect",
//     text: "Marcus and Richard argued loudly at dinner." },

import type { Clue } from "../models";

// Per-game ratio (GDD section 11). Each round is Noise + Redirect + Thread;
// Round 2's tamper swaps its noise for a redirect → final 2 noise / 4 redirect /
// 3 thread, inside the documented bands (noise 2–3, redirect 3–4, thread 3).
export const THREADS_PER_GAME = 3;
export const CLUES_PER_GAME = 9;
export const CLUES_PER_ROUND = 3;

export const CLUE_BANK: Clue[] = [
  // Add authored clues here.
];

/** True when a clue is eligible for the rolled scenario. */
export function clueFits(clue: Clue, locationKey: string, timeKey: string): boolean {
  if (clue.location !== undefined && clue.location !== locationKey) return false;
  if (clue.timeOfDeath !== undefined && clue.timeOfDeath !== timeKey) return false;
  return true;
}
