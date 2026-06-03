"""The character bank — INTENTIONALLY EMPTY.

The GDD (section 11) calls for a bank of 20–25 designated characters. That
content is authored separately and dropped in later, so this module ships the
*schema and loader* only — never the cast.

How to add characters
----------------------
Drop one or more JSON files into ``server/app/data/banks/characters/``. Each
file is a list of character objects shaped like :class:`Character` below, e.g.::

    [
      {
        "key": "marcus_vale",
        "name_male": "Marcus Vale",
        "name_female": "Marcia Vale",
        "archetype": "The Business Partner",
        "background": "...",
        "personality": "...",
        "relationship_with_richard": "...",
        "alibi": "...",
        "secret": "...",
        "candor": 0.4
      }
    ]

``load_characters()`` reads every JSON file in that directory and validates the
shape. Until files are added the bank is empty and the engine falls back to
clearly-labelled placeholder characters so the full game flow still runs.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

BANK_DIR = Path(__file__).parent / "banks" / "characters"

# Fields every authored character object must provide.
REQUIRED_FIELDS = (
    "key",
    "name_male",
    "name_female",
    "archetype",
    "background",
    "personality",
    "relationship_with_richard",
    "alibi",
    "secret",
)


@dataclass
class Character:
    """One entry in the designated-character bank."""

    key: str
    name_male: str
    name_female: str
    archetype: str
    background: str
    personality: str
    relationship_with_richard: str
    alibi: str
    secret: str
    # 0..1 — how forthcoming the character is when read aloud (GDD: "some
    # characters are written to be more candid than others"). Optional; defaults
    # to a guarded 0.3.
    candor: float = 0.3
    # Free-form extra fields an author wants to attach (kept, never required).
    extra: dict = field(default_factory=dict)

    def display_name(self, gender: str) -> str:
        return self.name_female if gender == "female" else self.name_male


def load_characters(bank_dir: Path | None = None) -> list[Character]:
    """Load and validate every authored character file. Empty when none exist."""
    directory = bank_dir or BANK_DIR
    characters: list[Character] = []
    if not directory.exists():
        return characters
    for path in sorted(directory.glob("*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        if not isinstance(raw, list):
            raise ValueError(f"{path.name}: expected a JSON list of characters")
        for obj in raw:
            characters.append(_parse(obj, source=path.name))
    return characters


def _parse(obj: dict, source: str) -> Character:
    missing = [f for f in REQUIRED_FIELDS if f not in obj]
    if missing:
        raise ValueError(f"{source}: character {obj.get('key', '?')} missing {missing}")
    known = set(REQUIRED_FIELDS) | {"candor"}
    extra = {k: v for k, v in obj.items() if k not in known}
    return Character(
        key=obj["key"],
        name_male=obj["name_male"],
        name_female=obj["name_female"],
        archetype=obj["archetype"],
        background=obj["background"],
        personality=obj["personality"],
        relationship_with_richard=obj["relationship_with_richard"],
        alibi=obj["alibi"],
        secret=obj["secret"],
        candor=float(obj.get("candor", 0.3)),
        extra=extra,
    )
