"""The live game state machine for one room.

Implements the GDD flow: Lobby → Narrator opens → Character sheets →
Introductions → Rules → 3× (Clue drop → Mingle → Hotseat vote → Interrogation)
→ Final vote → Reveal. Murderer tools (Round 2 tamper, Round 3 ban) and the
Emergency Vote live here too.

This class is transport-agnostic: it mutates state and produces narrator beats,
but never touches sockets. The room layer serialises and broadcasts it, and owns
the asyncio timers that drive timed stages. State is intentionally in-memory —
a party game is ephemeral and a sitting lasts one evening.
"""

from __future__ import annotations

import time
from collections import Counter
from dataclasses import dataclass, field

from .data import narrator
from .engine import GameEngine, has_accomplice
from .models import (
    ROLE_ACCOMPLICE,
    ROLE_INNOCENT,
    ROLE_MURDERER,
    GameContent,
)

# Stages, in flow order.
STAGE_LOBBY = "lobby"
STAGE_OPENING = "opening"
STAGE_SHEETS = "sheets"
STAGE_INTRODUCTIONS = "introductions"
STAGE_RULES = "rules"
STAGE_CLUE_DROP = "clue_drop"
STAGE_MINGLE = "mingle"
STAGE_HOTSEAT_VOTE = "hotseat_vote"
STAGE_INTERROGATION = "interrogation"
STAGE_FINAL_VOTE = "final_vote"
STAGE_REVEAL = "reveal"
STAGE_ENDED = "ended"

# Fixed timers (seconds). Mingle is per-player-count via GameContent.
INTERROGATION_SECONDS = 90  # GDD: 1.5 min (R1/R2); R3 runs longer (see below)
INTERROGATION_SECONDS_R3 = 180  # GDD section 6: Round 3 is a 3-minute open floor
FINAL_VOTE_SECONDS = 60  # GDD section 8
EMERGENCY_VOTE_SECONDS = 30  # GDD section 7


@dataclass
class Player:
    id: str
    name: str  # the real player's chosen handle (lobby only; drama uses persona)
    gender: str = "male"
    connected: bool = True


def majority_winner(votes: dict[str, str]) -> str | None:
    """Return the uniquely top-voted target, or None on a tie / no votes.

    The GDD speaks of "the player with the majority vote"; in a multi-candidate
    party vote we resolve that as a plurality with a unique leader. A tie at the
    top yields None ("no majority reached"), which skips the interrogation
    (section 6) or fails the token (section 8).
    """
    if not votes:
        return None
    tally = Counter(votes.values())
    top = tally.most_common()
    if len(top) == 1:
        return top[0][0]
    return top[0][0] if top[0][1] > top[1][1] else None


class Game:
    """One game within a sitting. Create per game; reuse the engine across games."""

    def __init__(self, engine: GameEngine, used_character_keys: set[str] | None = None):
        self._engine = engine
        self._used_keys = used_character_keys or set()
        self.stage: str = STAGE_LOBBY
        self.round_number: int = 0
        self.content: GameContent | None = None

        # Stage bookkeeping.
        self.intro_index: int = 0
        self.clue_reveal_index: int = 0
        self.stage_ends_at: float | None = None  # epoch seconds for timed stages
        self._narration: list[str] = []  # beats the TV should speak now
        # Bumped whenever narration is replaced, so the TV speaks each new line
        # exactly once even though state rebroadcasts every second during timers.
        self.narration_seq: int = 0

        # Voting state.
        self.hotseat_votes: dict[str, str] = {}  # voter_id -> target player_id
        self.hotseat_target: str | None = None
        self.banned_player_id: str | None = None  # Round 3 murderer ban
        self.ban_used: bool = False

        # Final vote: voter_id -> {"M": player_id, "A": player_id|None}.
        self.final_tokens: dict[str, dict[str, str | None]] = {}

        # Emergency vote (once per game).
        self.emergency_used: bool = False
        self.emergency_active: bool = False
        self.emergency_flags: dict[str, str] = {}  # mingle pre-trigger targets
        self.emergency_votes: dict[str, str] = {}  # the live 30s ballot
        self.last_result: dict | None = None  # filled at reveal

    @property
    def narration(self) -> list[str]:
        return self._narration

    @narration.setter
    def narration(self, beats: list[str]) -> None:
        self._narration = beats
        self.narration_seq += 1

    # -- lifecycle ----------------------------------------------------------
    def start(self, players: list[Player]) -> None:
        """Generate content and open the game (GDD Phase 2)."""
        ids = [p.id for p in players]
        genders = {p.id: p.gender for p in players}
        self.content = self._engine.generate(ids, genders, used_character_keys=self._used_keys)
        self.round_number = 0
        self.stage = STAGE_OPENING
        self.narration = narrator.opening(
            num_players=len(players),
            has_accomplice=self.content.accomplice_id is not None,
            location=self.content.location,
            time=self.content.time,
        )

    def character_keys_used(self) -> set[str]:
        """Keys this game consumed — fed back for cross-game rotation."""
        if not self.content:
            return set()
        return {a.character.key for a in self.content.assignments}

    # -- host-driven advancement -------------------------------------------
    def advance(self) -> None:
        """Move to the next stage. Driven by the TV/host control.

        Timed stages (mingle, interrogation, final vote) are normally advanced by
        the room's timer, but the host may advance early; either way we just walk
        the flow graph.
        """
        if self.stage == STAGE_OPENING:
            self._enter_sheets()
        elif self.stage == STAGE_SHEETS:
            self._enter_introductions()
        elif self.stage == STAGE_INTRODUCTIONS:
            self._advance_introductions()
        elif self.stage == STAGE_RULES:
            self._enter_round(1)
        elif self.stage == STAGE_CLUE_DROP:
            self._advance_clue_drop()
        elif self.stage == STAGE_MINGLE:
            self._enter_hotseat_vote()
        elif self.stage == STAGE_HOTSEAT_VOTE:
            self._resolve_hotseat()
        elif self.stage == STAGE_INTERROGATION:
            self._after_interrogation()
        elif self.stage == STAGE_FINAL_VOTE:
            self._resolve_final_vote()

    # -- stage transitions --------------------------------------------------
    def _enter_sheets(self) -> None:
        self.stage = STAGE_SHEETS
        self.narration = []  # players read privately; nothing spoken

    def _enter_introductions(self) -> None:
        self.stage = STAGE_INTRODUCTIONS
        self.intro_index = 0
        self.narration = ["Introductions. Read yours aloud, exactly as it appears."]

    def _advance_introductions(self) -> None:
        self.intro_index += 1
        if self.content and self.intro_index >= len(self.content.assignments):
            self._enter_rules()
        else:
            self.narration = []

    def _enter_rules(self) -> None:
        self.stage = STAGE_RULES
        mins = self.content.mingle_minutes if self.content else 3
        self.narration = narrator.rules_explainer(mins)

    def _enter_round(self, n: int) -> None:
        self.round_number = n
        self._enter_clue_drop()

    def _enter_clue_drop(self) -> None:
        self.stage = STAGE_CLUE_DROP
        self.clue_reveal_index = 0
        tampered = self._current_round().tampered
        self.narration = narrator.clue_drop_intro(self.round_number, tampered)

    def _advance_clue_drop(self) -> None:
        """Reveal clues one at a time, then move to mingle."""
        rnd = self._current_round()
        if self.clue_reveal_index < len(rnd.clues):
            clue = rnd.clues[self.clue_reveal_index]
            self.narration = narrator.clue_reveal(self.clue_reveal_index, clue.text)
            self.clue_reveal_index += 1
        else:
            self._enter_mingle()

    def _enter_mingle(self) -> None:
        self.stage = STAGE_MINGLE
        self.emergency_flags = {}
        mins = self.content.mingle_minutes if self.content else 3
        self.stage_ends_at = time.time() + mins * 60
        self.narration = ["Mingle. Move, talk, and make your case. The clock is running."]

    def _enter_hotseat_vote(self) -> None:
        self.stage = STAGE_HOTSEAT_VOTE
        self.stage_ends_at = None
        self.hotseat_votes = {}
        self.banned_player_id = None
        self.narration = ["Time. On your phones — who takes the hotseat?"]

    def _resolve_hotseat(self) -> None:
        winner = majority_winner(self.hotseat_votes)

        # GDD section 6 — Round 3 murderer ban resolves against the would-be target.
        if self.round_number == 3 and self.banned_player_id and not self.ban_used:
            if winner == self.banned_player_id:
                self.ban_used = True
                name = self._player_persona(winner)
                self.narration = narrator.ban_blocked(name)
                # Re-open the vote, excluding the banned player.
                self.hotseat_votes = {}
                self.stage = STAGE_HOTSEAT_VOTE
                return
            elif winner is not None:
                self.ban_used = True
                self.narration = narrator.ban_wasted(
                    self._player_persona(self.banned_player_id), self._player_persona(winner)
                )

        self.hotseat_target = winner
        if winner is None:
            self.narration = narrator.hotseat_result(None)
            self._after_interrogation()  # nothing to interrogate; advance
            return
        if not self.narration:
            self.narration = narrator.hotseat_result(self._player_persona(winner))
        self._enter_interrogation()

    def _enter_interrogation(self) -> None:
        self.stage = STAGE_INTERROGATION
        seconds = INTERROGATION_SECONDS_R3 if self.round_number == 3 else INTERROGATION_SECONDS
        self.stage_ends_at = time.time() + seconds

    def _after_interrogation(self) -> None:
        self.stage_ends_at = None
        if self.round_number < 3:
            self._enter_round(self.round_number + 1)
        else:
            self._enter_final_vote()

    def _enter_final_vote(self) -> None:
        self.stage = STAGE_FINAL_VOTE
        self.final_tokens = {}
        self.stage_ends_at = time.time() + FINAL_VOTE_SECONDS
        self.narration = narrator.final_vote_open()

    def _resolve_final_vote(self) -> None:
        self.stage_ends_at = None
        won = self._evaluate_final()
        self._enter_reveal(won)

    def _enter_reveal(self, innocents_won: bool) -> None:
        self.stage = STAGE_REVEAL
        c = self.content
        assert c is not None
        murderer = self._player_persona(c.murderer_id)
        accomplice = self._player_persona(c.accomplice_id) if c.accomplice_id else None
        self.narration = narrator.reveal(murderer, accomplice, innocents_won)
        self.last_result = {
            "innocents_won": innocents_won,
            "murderer": murderer,
            "accomplice": accomplice,
        }

    # -- voting actions -----------------------------------------------------
    def cast_hotseat_vote(self, voter_id: str, target_id: str) -> None:
        if self.stage != STAGE_HOTSEAT_VOTE:
            return
        if self.banned_player_id and target_id == self.banned_player_id:
            return  # can't vote for the banned player on a revote
        self.hotseat_votes[voter_id] = target_id

    def set_ban(self, voter_id: str, target_id: str | None) -> None:
        """Round 3 only — the murderer privately arms (or clears) the ban."""
        if self.round_number != 3 or self.ban_used:
            return
        if not self.content or voter_id != self.content.murderer_id:
            return
        self.banned_player_id = target_id

    def place_token(self, voter_id: str, token: str, target_id: str | None) -> None:
        """Final vote — drag the M or A token onto a player (section 8)."""
        if self.stage != STAGE_FINAL_VOTE or token not in ("M", "A"):
            return
        if token == "A" and not self._game_has_accomplice():
            return  # no accomplice token in 4–5 player games
        slot = self.final_tokens.setdefault(voter_id, {"M": None, "A": None})
        # The two tokens must sit on different names (section 8).
        other = "A" if token == "M" else "M"
        if target_id is not None and slot.get(other) == target_id:
            return
        slot[token] = target_id

    # -- emergency vote (section 7) -----------------------------------------
    def flag_emergency(self, voter_id: str, target_id: str | None) -> None:
        """During mingle, an innocent signals a desired emergency target.

        When every innocent has flagged the *same* target, the 30-second
        emergency ballot opens. The murderer/accomplice cannot trigger it.
        """
        if self.stage != STAGE_MINGLE or self.emergency_used or self.emergency_active:
            return
        if self._role_of(voter_id) != ROLE_INNOCENT:
            return
        if target_id is None:
            self.emergency_flags.pop(voter_id, None)
            return
        self.emergency_flags[voter_id] = target_id
        self._maybe_trigger_emergency()

    def _maybe_trigger_emergency(self) -> None:
        innocents = [p for p in self._player_ids() if self._role_of(p) == ROLE_INNOCENT]
        if not innocents:
            return
        if all(self.emergency_flags.get(p) for p in innocents):
            targets = {self.emergency_flags[p] for p in innocents}
            if len(targets) == 1:
                self._open_emergency_vote()

    def _open_emergency_vote(self) -> None:
        self.emergency_active = True
        self.emergency_votes = {}
        self.stage_ends_at = time.time() + EMERGENCY_VOTE_SECONDS
        self.narration = [
            "An emergency vote has been called!",
            "Thirty seconds. If you are certain, name the killer now.",
        ]

    def cast_emergency_vote(self, voter_id: str, target_id: str) -> None:
        if not self.emergency_active:
            return
        self.emergency_votes[voter_id] = target_id
        # Close early once every player has locked a vote (section 7).
        if len(self.emergency_votes) >= len(self._player_ids()):
            self.resolve_emergency_vote()

    def resolve_emergency_vote(self) -> None:
        """Unanimously-correct innocents win immediately; otherwise it's spent."""
        if not self.emergency_active or not self.content:
            return
        self.emergency_active = False
        self.emergency_used = True
        self.stage_ends_at = None
        innocents = [p for p in self._player_ids() if self._role_of(p) == ROLE_INNOCENT]
        unanimous_correct = bool(innocents) and all(
            self.emergency_votes.get(p) == self.content.murderer_id for p in innocents
        )
        if unanimous_correct:
            self._enter_reveal(True)
        else:
            self.narration = ["Not unanimous. The emergency vote is spent. We continue."]
            self._enter_mingle_resume()

    def _enter_mingle_resume(self) -> None:
        # Return to mingle with whatever time was left rounded back up a little.
        self.stage = STAGE_MINGLE
        self.emergency_flags = {}
        self.stage_ends_at = time.time() + 30

    # -- resolution ---------------------------------------------------------
    def _evaluate_final(self) -> bool:
        """Innocents win iff M-majority == murderer AND A-majority == accomplice."""
        c = self.content
        assert c is not None
        m_votes = {v: t["M"] for v, t in self.final_tokens.items() if t.get("M")}
        m_winner = majority_winner(m_votes)
        if m_winner != c.murderer_id:
            return False
        if self._game_has_accomplice():
            a_votes = {v: t["A"] for v, t in self.final_tokens.items() if t.get("A")}
            a_winner = majority_winner(a_votes)
            if a_winner != c.accomplice_id:
                return False
        return True

    # -- helpers ------------------------------------------------------------
    def _current_round(self):
        assert self.content is not None
        return self.content.rounds[self.round_number - 1]

    def _player_ids(self) -> list[str]:
        return [a.player_id for a in self.content.assignments] if self.content else []

    def _role_of(self, player_id: str) -> str:
        a = self.content.assignment_for(player_id) if self.content else None
        return a.role if a else ROLE_INNOCENT

    def _player_persona(self, player_id: str | None) -> str:
        if not player_id or not self.content:
            return "no one"
        a = self.content.assignment_for(player_id)
        return a.display_name if a else "no one"

    def _game_has_accomplice(self) -> bool:
        return bool(self.content and self.content.accomplice_id)
