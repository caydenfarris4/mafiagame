"""The clue bank — INTENTIONALLY EMPTY.

The GDD (sections 9 & 11) calls for 40–60 hand-crafted clues per
character × scenario combination, each tagged with one of three types. That
content is authored separately, so this module ships the *schema, loader and
selection rules* only — never the clues themselves.

Clue types (GDD section 11)
---------------------------
- ``noise``    — sounds relevant, leads nowhere.
- ``redirect`` — true information that points at an innocent player.
- ``thread``   — subtly implicates the murderer; only damning in combination.

How to add clues
----------------
Drop JSON files into ``server/app/data/banks/clues/``. Each file is a list of
clue objects shaped like :class:`Clue`. A clue is keyed to the character it
belongs to and (optionally) scoped to a death location / time of death so the
engine can pull a set that fits the rolled scenario::

    [
      {
        "character_key": "marcus_vale",
        "type": "thread",
        "text": "Marcus's car was seen leaving the boathouse road just after midnight.",
        "location": "boathouse",      // optional; omit for any-location
        "time_of_death": "midnight"   // optional; omit for any-time
      }
    ]

Until files are added the bank is empty and the engine fabricates clearly
labelled ``[PLACEHOLDER]`` clues so the round structure and type ratios can be
exercised end to end before real content exists.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path

BANK_DIR = Path(__file__).parent / "banks" / "clues"

CLUE_TYPES = ("noise", "redirect", "thread")

# Section 11 — "every game pulls exactly 9 clues (3 per round)".
CLUES_PER_GAME = 9
CLUES_PER_ROUND = 3

# Section 11 type ratio per game: 2–3 noise, 3–4 redirect, 3 thread (one per
# round). Threads are fixed at exactly 3; noise/redirect fill the remaining 6.
THREADS_PER_GAME = 3
NOISE_RANGE = (2, 3)
REDIRECT_RANGE = (3, 4)


@dataclass
class Clue:
    """One entry in the clue bank."""

    character_key: str
    type: str  # one of CLUE_TYPES
    text: str
    location: str | None = None  # scenario scope; None = any location
    time_of_death: str | None = None  # scenario scope; None = any time

    def fits(self, location_key: str, time_key: str) -> bool:
        """True when this clue is eligible for the rolled scenario."""
        if self.location is not None and self.location != location_key:
            return False
        if self.time_of_death is not None and self.time_of_death != time_key:
            return False
        return True


def load_clues(bank_dir: Path | None = None) -> list[Clue]:
    """Load and validate every authored clue file. Empty when none exist."""
    directory = bank_dir or BANK_DIR
    clues: list[Clue] = []
    if not directory.exists():
        return clues
    for path in sorted(directory.glob("*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(raw, list):
            raise ValueError(f"{path.name}: expected a JSON list of clues")
        for obj in raw:
            clues.append(_parse(obj, source=path.name))
    return clues


def _parse(obj: dict, source: str) -> Clue:
    for required in ("character_key", "type", "text"):
        if required not in obj:
            raise ValueError(f"{source}: clue missing '{required}': {obj}")
    if obj["type"] not in CLUE_TYPES:
        raise ValueError(f"{source}: clue type must be one of {CLUE_TYPES}, got {obj['type']!r}")
    return Clue(
        character_key=obj["character_key"],
        type=obj["type"],
        text=obj["text"],
        location=obj.get("location"),
        time_of_death=obj.get("time_of_death"),
    )
