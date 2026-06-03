"""The generation engine — turns a player list into a full game's content.

This is the heart of the GDD's section 11: a pure-Python, no-API random
generator that assigns roles, rotates characters with cross-game memory, rolls a
scenario, and pulls a balanced 9-clue set. It is deterministic given a seed, so
it is fully unit-testable.

The character and clue banks ship empty (see ``data/characters.py`` and
``data/clues.py``). When a bank can't satisfy a draw, the engine substitutes
clearly-labelled ``[PLACEHOLDER]`` content so the entire game flow is runnable
before the real cast and clues are authored.
"""

from __future__ import annotations

from .data import characters as char_data
from .data import clues as clue_data
from .data.characters import Character
from .data.scenarios import DEATH_LOCATIONS, TIMES_OF_DEATH
from .models import (
    ROLE_ACCOMPLICE,
    ROLE_INNOCENT,
    ROLE_MURDERER,
    Assignment,
    GameContent,
    GeneratedClue,
    RoundContent,
)
from .rng import GameRNG

# GDD section 6 — mingle timer scales with player count.
def mingle_minutes_for(num_players: int) -> int:
    if num_players <= 5:
        return 2
    if num_players <= 7:
        return 3
    if num_players <= 9:
        return 4
    return 5


# GDD section 1 — two murderers (an accomplice) at 6+ players.
def has_accomplice(num_players: int) -> bool:
    return num_players >= 6


class GameEngine:
    """Generates one :class:`GameContent` per call to :meth:`generate`.

    ``used_character_keys`` carries cross-game memory within a sitting: keys used
    in earlier games of the sitting are de-prioritised so casts rotate
    (GDD section 2 / 12).
    """

    def __init__(self, bank_characters: list[Character] | None = None,
                 bank_clues: list[clue_data.Clue] | None = None):
        # Banks are loaded once and reused. Tests can inject fakes.
        self.characters = bank_characters if bank_characters is not None else char_data.load_characters()
        self.clues = bank_clues if bank_clues is not None else clue_data.load_clues()

    # -- public -------------------------------------------------------------
    def generate(self, player_ids: list[str], genders: dict[str, str],
                 used_character_keys: set[str] | None = None,
                 seed: str | None = None) -> GameContent:
        if len(player_ids) < 4:
            raise ValueError("Dead in the Water needs at least 4 players")
        rng = GameRNG(seed)
        used = used_character_keys or set()

        location = rng.choice(DEATH_LOCATIONS)
        time = rng.choice(TIMES_OF_DEATH)

        cast = self._rotate_characters(rng, len(player_ids), used)
        roles = self._assign_roles(rng, player_ids)
        assignments = [
            Assignment(
                player_id=pid,
                character=cast[i],
                gender=genders.get(pid, "male"),
                role=roles[pid],
            )
            for i, pid in enumerate(player_ids)
        ]

        murderer_id = next(pid for pid, r in roles.items() if r == ROLE_MURDERER)
        accomplice_id = next((pid for pid, r in roles.items() if r == ROLE_ACCOMPLICE), None)
        murderer_char = next(a.character for a in assignments if a.player_id == murderer_id)
        innocent_chars = [a.character for a in assignments if a.role == ROLE_INNOCENT]

        rounds = self._build_rounds(rng, location.key, time.key, murderer_char, innocent_chars)

        return GameContent(
            seed=rng.seed,
            location=location,
            time=time,
            mingle_minutes=mingle_minutes_for(len(player_ids)),
            assignments=assignments,
            rounds=rounds,
            murderer_id=murderer_id,
            accomplice_id=accomplice_id,
        )

    # -- role assignment ----------------------------------------------------
    def _assign_roles(self, rng: GameRNG, player_ids: list[str]) -> dict[str, str]:
        """1 murderer (4–5 players), + 1 accomplice (6+). Rest innocent."""
        roles = {pid: ROLE_INNOCENT for pid in player_ids}
        guilty = rng.sample(player_ids, 2 if has_accomplice(len(player_ids)) else 1)
        roles[guilty[0]] = ROLE_MURDERER
        if len(guilty) > 1:
            roles[guilty[1]] = ROLE_ACCOMPLICE
        return roles

    # -- character rotation (cross-game memory) -----------------------------
    def _rotate_characters(self, rng: GameRNG, count: int, used: set[str]) -> list[Character]:
        """Pick ``count`` characters, preferring those unused this sitting.

        GDD section 2: prioritise characters not yet used in the sitting; fall
        back to the full bank when the unused pool is exhausted. With an empty
        bank, fabricate labelled placeholders so the game still runs.
        """
        if not self.characters:
            return [_placeholder_character(i) for i in range(count)]

        fresh = [c for c in self.characters if c.key not in used]
        stale = [c for c in self.characters if c.key in used]
        chosen: list[Character] = []

        # Draw from the fresh pool first, then top up from the stale pool.
        if len(fresh) >= count:
            chosen = rng.sample(fresh, count)
        else:
            chosen = list(rng.shuffled(fresh))
            need = count - len(chosen)
            if need > len(stale):
                # Bank smaller than the table: reuse characters to fill seats.
                pool = stale or self.characters
                while need > 0:
                    chosen.append(rng.choice(pool))
                    need -= 1
            else:
                chosen.extend(rng.sample(stale, need))
        return rng.shuffled(chosen)

    # -- clue generation ----------------------------------------------------
    def _build_rounds(self, rng: GameRNG, location_key: str, time_key: str,
                      murderer: Character, innocents: list[Character]) -> list[RoundContent]:
        """Pull the 9-clue set (3 rounds × 3), honouring the GDD type ratio.

        Each round is a standard Noise + Redirect + Thread trio (section 6). The
        three threads (one per round) implicate the murderer; redirects point at
        innocents; noise leads nowhere. Round 2's tamper then swaps that round's
        noise clue for a second redirect, yielding the final game ratio of
        2 noise / 4 redirect / 3 thread — inside the section 11 bands.
        """
        threads = self._pull(rng, "thread", 3, location_key, time_key, owners=[murderer])
        redirects = self._pull(rng, "redirect", 3, location_key, time_key, owners=innocents)
        noises = self._pull(rng, "noise", 3, location_key, time_key,
                            owners=innocents or [murderer])

        rounds: list[RoundContent] = []
        for r in range(3):
            trio = [threads[r], redirects[r], noises[r]]
            clues = rng.shuffled([_renumber(c, r + 1) for c in trio])
            rounds.append(RoundContent(round_number=r + 1, clues=clues))

        self._apply_round2_tamper(rng, rounds, location_key, time_key, innocents)
        return rounds

    def _apply_round2_tamper(self, rng: GameRNG, rounds: list[RoundContent],
                             location_key: str, time_key: str,
                             innocents: list[Character]) -> None:
        """GDD section 6: murderer swaps Round 2's noise clue for a redirect."""
        rnd = rounds[1]
        noise_clue = next((c for c in rnd.clues if c.type == "noise"), None)
        if noise_clue is None:
            return  # this round happened to roll no noise; nothing to tamper
        replacement = self._pull(rng, "redirect", 1, location_key, time_key,
                                 owners=innocents or None)[0]
        replacement = _renumber(replacement, 2)
        rnd.clues = [replacement if c.id == noise_clue.id else c for c in rnd.clues]
        rnd.tampered = True
        rnd.replaced_out = noise_clue
        rnd.replaced_in = replacement

    def _pull(self, rng: GameRNG, clue_type: str, count: int, location_key: str,
              time_key: str, owners: list[Character] | None) -> list[GeneratedClue]:
        """Draw ``count`` clues of ``clue_type`` that fit the scenario.

        Filters the bank by type, scenario fit, and (when given) the owning
        characters. Falls back to labelled placeholders to guarantee ``count``.
        """
        owner_keys = {c.key for c in owners} if owners else None
        pool = [
            c for c in self.clues
            if c.type == clue_type
            and c.fits(location_key, time_key)
            and (owner_keys is None or c.character_key in owner_keys)
        ]
        out: list[GeneratedClue] = []
        chosen_pool = rng.shuffled(pool)
        for i in range(count):
            if i < len(chosen_pool):
                src = chosen_pool[i]
                out.append(GeneratedClue(
                    id=f"{clue_type}-{rng.seed}-{i}-{rng.randint(1000, 9999)}",
                    type=clue_type,
                    text=src.text,
                    round_number=0,  # set when dealt into a round
                ))
            else:
                out.append(_placeholder_clue(rng, clue_type, i, owners))
        return out


# -- placeholders (used only until the banks are authored) ------------------
def _placeholder_character(index: int) -> Character:
    label = f"Suspect {index + 1}"
    return Character(
        key=f"__placeholder_{index}",
        name_male=label,
        name_female=label,
        archetype="[PLACEHOLDER — add characters to data/banks/characters]",
        background="Placeholder background. Author the character bank to replace this.",
        personality="Placeholder personality.",
        relationship_with_richard="Placeholder relationship with Richard.",
        alibi="Placeholder alibi for the night.",
        secret="Placeholder secret.",
        candor=0.3,
    )


def _placeholder_clue(rng: GameRNG, clue_type: str, index: int,
                      owners: list[Character] | None) -> GeneratedClue:
    who = owners[0].display_name("male") if owners else "someone"
    text = {
        "thread": f"[PLACEHOLDER thread] Something subtly ties the murderer to the scene.",
        "redirect": f"[PLACEHOLDER redirect] A true detail makes {who} look guilty.",
        "noise": f"[PLACEHOLDER noise] An odd detail that ultimately means nothing.",
    }[clue_type]
    return GeneratedClue(
        id=f"{clue_type}-ph-{rng.randint(1000, 9999)}-{index}",
        type=clue_type,
        text=text,
        round_number=0,
        is_placeholder=True,
    )


def _renumber(clue: GeneratedClue, round_number: int) -> GeneratedClue:
    clue.round_number = round_number
    return clue
