// The clue bank — scenario-keyed (GDD section 11).
//
// HOW IT WORKS
// ------------
// Clues are tied to a **scenario** = (death location × time of death). There are
// 5 locations × 4 times = 20 scenarios, and each scenario holds ~15 clues. The
// scenario is the constant; the clues sit on top of it and describe the scene,
// the timing, and the premeditation around Richard's death.
//
// Clues are NOT tied to characters. Instead a clue *points at* whatever
// character it's assigned at game time, via a `{name}` placeholder in the text.
// So the same clue can implicate a different person every game:
//   - thread   → {name} is filled with the MURDERER (subtly implicates them).
//   - redirect → {name} is filled with a random INNOCENT (true, but misleading).
//   - noise    → leads nowhere; usually no {name} (pure scene/atmosphere).
//
// Every game the engine pulls, from the rolled scenario:
//   3 threads (one per round) + 3 redirects + 3 noise, then Round 2's tamper
//   swaps its noise for a 4th redirect → a final 3 thread / 4 redirect / 2 noise
//   spread, inside the GDD bands (noise 2–3, redirect 3–4, thread 3).
//
// So each scenario should provide at least 3 thread, 4 redirect and 3 noise
// clues among its ~15 (the rest add variety to what shows up game to game).
//
// AUTHORING
// ---------
// Fill the `clues: []` array of each scenario below. Use `{name}` wherever the
// clue should name the person it points at. Examples are in the first scenario
// (boathouse × midnight); the other 19 are scaffolded and ready to fill. Until
// a scenario has clues, the engine substitutes labelled `[PLACEHOLDER]` clues.

import type { ClueType } from "../models";

export const THREADS_PER_GAME = 3;
export const CLUES_PER_GAME = 9;
export const CLUES_PER_ROUND = 3;

export interface ScenarioClue {
  type: ClueType;
  /** Clue text. Use `{name}` where the pointed-at character should be named. */
  text: string;
}

export interface ScenarioClues {
  location: string; // location key (see scenarios.ts)
  time: string; // time-of-death key
  clues: ScenarioClue[];
}

function scenario(location: string, time: string, clues: ScenarioClue[] = []): ScenarioClues {
  return { location, time, clues };
}

export const SCENARIO_CLUES: ScenarioClues[] = [
  // ── THE DOCK ──────────────────────────────────────────────────────────────
  scenario("dock", "post_dinner"),
  scenario("dock", "midnight"),
  scenario("dock", "early_morning"),
  scenario("dock", "midday"),

  // ── THE BOATHOUSE ───────────────────────────────────────────────────────────
  // Worked example — author the rest to match this shape (~4 thread, ~6
  // redirect, ~5 noise = 15).
  scenario("boathouse", "midnight", [
    // Threads — point at the murderer; quiet signs of planning and presence.
    { type: "thread", text: `Earlier in the week, {name} had asked who still kept a key to the boathouse.` },
    { type: "thread", text: `A guest remembers {name} drifting away from the group not long before midnight.` },
    { type: "thread", text: `A scrap of fabric matching {name}'s outfit was caught on the boathouse latch.` },
    { type: "thread", text: `When the body was found at the water, {name} was the only one who didn't look surprised.` },
    // Redirects — true, but they point the room at an innocent.
    { type: "redirect", text: `{name} and Richard had argued loudly on the porch after dinner.` },
    { type: "redirect", text: `{name} was seen heading toward the lake with a flashlight around midnight.` },
    { type: "redirect", text: `{name} had wet shoes by the time the police arrived.` },
    { type: "redirect", text: `{name} owed Richard money and had been avoiding him all evening.` },
    { type: "redirect", text: `{name} knew the boathouse better than anyone — they practically lived on that dock.` },
    { type: "redirect", text: `{name} had slipped out for a "phone call" right around the time of death.` },
    // Noise — sounds relevant, leads nowhere.
    { type: "noise", text: `The boathouse lantern was still burning when the body was found.` },
    { type: "noise", text: `One of the canoes had come untied and drifted out onto the lake.` },
    { type: "noise", text: `A half-finished glass of wine sat on the boathouse step.` },
    { type: "noise", text: `The old boathouse door bangs in the wind; several guests heard it all night.` },
    { type: "noise", text: `The house clock's midnight chime startled half the party.` },
  ]),
  scenario("boathouse", "post_dinner"),
  scenario("boathouse", "early_morning"),
  scenario("boathouse", "midday"),

  // ── THE KITCHEN ─────────────────────────────────────────────────────────────
  scenario("kitchen", "post_dinner"),
  scenario("kitchen", "midnight"),
  scenario("kitchen", "early_morning"),
  scenario("kitchen", "midday"),

  // ── THE MASTER BEDROOM ──────────────────────────────────────────────────────
  scenario("master_bedroom", "post_dinner"),
  scenario("master_bedroom", "midnight"),
  scenario("master_bedroom", "early_morning"),
  scenario("master_bedroom", "midday"),

  // ── THE BACK PORCH ──────────────────────────────────────────────────────────
  scenario("back_porch", "post_dinner"),
  scenario("back_porch", "midnight"),
  scenario("back_porch", "early_morning"),
  scenario("back_porch", "midday"),
];

/** The clue pool for a rolled scenario, or [] if it isn't authored yet. */
export function cluesForScenario(list: ScenarioClues[], location: string, time: string): ScenarioClue[] {
  return list.find((s) => s.location === location && s.time === time)?.clues ?? [];
}
