"""Shared dataclasses passed between the generation engine and the live game."""

from __future__ import annotations

from dataclasses import dataclass, field

from .data.characters import Character
from .data.scenarios import DeathLocation, TimeOfDeath

# Role keys used throughout the engine and game state machine.
ROLE_MURDERER = "murderer"
ROLE_ACCOMPLICE = "accomplice"
ROLE_INNOCENT = "innocent"


@dataclass
class Assignment:
    """A character + role handed to one player for one game."""

    player_id: str
    character: Character
    gender: str  # "male" | "female"
    role: str  # ROLE_* above

    @property
    def display_name(self) -> str:
        return self.character.display_name(self.gender)


@dataclass
class GeneratedClue:
    """One clue placed into a round, already typed and scenario-fitted."""

    id: str
    type: str  # noise | redirect | thread
    text: str
    round_number: int
    is_placeholder: bool = False


@dataclass
class RoundContent:
    """The three clues for one round, plus this round's tamper state."""

    round_number: int
    clues: list[GeneratedClue]
    tampered: bool = False
    # When tampered (Round 2), the noise clue that was swapped out and the
    # redirect that replaced it. The live game reveals the tampered list but
    # records what changed so the reveal can explain it.
    replaced_out: GeneratedClue | None = None
    replaced_in: GeneratedClue | None = None


@dataclass
class GameContent:
    """Everything the RNG engine generates for a single game."""

    seed: str
    location: DeathLocation
    time: TimeOfDeath
    mingle_minutes: int
    assignments: list[Assignment]
    rounds: list[RoundContent]
    murderer_id: str
    accomplice_id: str | None = field(default=None)

    def assignment_for(self, player_id: str) -> Assignment | None:
        return next((a for a in self.assignments if a.player_id == player_id), None)
