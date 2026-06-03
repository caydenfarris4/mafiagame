"""Scenario axes — the randomized variables that define a game's setting.

Per the GDD (section 11) a scenario is the cross product of a death location and
a time of death. These two axes are part of the game's fixed rules (not
swappable content), so they live here rather than in the fillable banks.

5 locations x 4 times = 20 scenario combinations.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class DeathLocation:
    key: str
    name: str


@dataclass(frozen=True)
class TimeOfDeath:
    key: str
    name: str
    window: str


# Section 11 — Death Location (5 options).
DEATH_LOCATIONS: list[DeathLocation] = [
    DeathLocation("dock", "The dock"),
    DeathLocation("boathouse", "The boathouse"),
    DeathLocation("kitchen", "The kitchen"),
    DeathLocation("master_bedroom", "The master bedroom"),
    DeathLocation("back_porch", "The back porch"),
]

# Section 11 — Time of Death (4 options).
TIMES_OF_DEATH: list[TimeOfDeath] = [
    TimeOfDeath("post_dinner", "Post Dinner", "7–9pm"),
    TimeOfDeath("midnight", "Midnight", "11pm–12am"),
    TimeOfDeath("early_morning", "Early Morning", "2–4am"),
    TimeOfDeath("midday", "Midday", "sudden"),
]

LOCATIONS_BY_KEY = {loc.key: loc for loc in DEATH_LOCATIONS}
TIMES_BY_KEY = {t.key: t for t in TIMES_OF_DEATH}
