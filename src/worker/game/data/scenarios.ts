// Scenario axes — the randomized variables that define a game's setting.
// Per the GDD (section 11): 5 locations x 4 times = 20 scenario combinations.
// These are fixed rules, not swappable content, so they live here.

import type { DeathLocation, TimeOfDeath } from "../models";

export const DEATH_LOCATIONS: DeathLocation[] = [
  { key: "dock", name: "The dock" },
  { key: "boathouse", name: "The boathouse" },
  { key: "kitchen", name: "The kitchen" },
  { key: "master_bedroom", name: "The master bedroom" },
  { key: "back_porch", name: "The back porch" },
];

export const TIMES_OF_DEATH: TimeOfDeath[] = [
  { key: "post_dinner", name: "Post Dinner", window: "7–9pm" },
  { key: "midnight", name: "Midnight", window: "11pm–12am" },
  { key: "early_morning", name: "Early Morning", window: "2–4am" },
  { key: "midday", name: "Midday", window: "sudden" },
];
