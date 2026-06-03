"""Deterministic random-generation engine for Dead in the Water.

Per the Game Design Document (section 11), every scenario, role assignment and
clue pull is produced by a *Python random sequence generator* — no AI / API
token is ever used. This module is that generator.

Everything funnels through :class:`GameRNG`, a thin, seedable wrapper around the
standard-library :class:`random.Random`. Seeding it makes the whole game
reproducible, which is what lets the engine be unit-tested and lets a single
game be replayed from its seed token.

The "token" the design document refers to is a *seed token* — a short,
human-readable string that fully determines a game's randomness. It is produced
here algorithmically (``make_seed_token``); it is NOT an authentication token
and never leaves the server unless we explicitly want a game to be replayable.
"""

from __future__ import annotations

import random
import time
from typing import Iterable, Sequence, TypeVar

T = TypeVar("T")

# Room codes and seed tokens use an unambiguous alphabet: no 0/O, 1/I/L which
# are easy to misread on a phone when typing a 4-character room code.
ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
SEED_TOKEN_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"


class GameRNG:
    """A seedable random source for one game.

    Construct with an explicit ``seed`` for reproducible games (tests, replays)
    or leave it ``None`` to draw a fresh seed token from the OS clock + entropy.
    The resolved seed is always available as :attr:`seed` so a game can be
    replayed later.
    """

    def __init__(self, seed: str | None = None):
        self.seed: str = seed or make_seed_token()
        # Hash the string seed to an int so equal tokens always yield the same
        # stream regardless of Python's per-process hash randomisation.
        self._random = random.Random(_stable_hash(self.seed))

    # -- primitives ---------------------------------------------------------
    def choice(self, items: Sequence[T]) -> T:
        """Pick one item. Raises on an empty sequence (callers guard banks)."""
        if not items:
            raise ValueError("cannot choose from an empty sequence")
        return self._random.choice(items)

    def sample(self, items: Sequence[T], k: int) -> list[T]:
        """Pick ``k`` distinct items, preserving no particular order."""
        if k > len(items):
            raise ValueError(f"cannot sample {k} items from {len(items)}")
        return self._random.sample(list(items), k)

    def shuffled(self, items: Iterable[T]) -> list[T]:
        """Return a new shuffled list; never mutates the input."""
        out = list(items)
        self._random.shuffle(out)
        return out

    def randint(self, low: int, high: int) -> int:
        """Inclusive integer in ``[low, high]``."""
        return self._random.randint(low, high)

    def weighted_choice(self, items: Sequence[T], weights: Sequence[float]) -> T:
        """Pick one item with the given relative weights."""
        if not items:
            raise ValueError("cannot choose from an empty sequence")
        return self._random.choices(items, weights=weights, k=1)[0]

    # -- domain helpers -----------------------------------------------------
    def pick_variation(self, options: Sequence[T]) -> T:
        """The GDD's "intelligently loop through and choose the variation".

        A clue scenario can map to many hand-written variations; this draws one
        of them. Kept as a named method so the intent reads clearly at call
        sites and so variation selection can grow smarter later (e.g. avoiding
        recently-used variations) without touching callers.
        """
        return self.choice(options)

    def room_code(self) -> str:
        """A fresh 4-character room code from the unambiguous alphabet."""
        return "".join(self._random.choice(ROOM_CODE_ALPHABET) for _ in range(4))


def make_seed_token(length: int = 10) -> str:
    """Generate a fresh, human-readable seed token.

    Mixes a high-resolution clock with the OS CSPRNG so two games created in the
    same millisecond still differ. The token fully determines a :class:`GameRNG`
    stream, so persisting it is enough to replay a game.
    """
    rng = random.Random(f"{time.time_ns()}-{random.SystemRandom().random()}")
    return "".join(rng.choice(SEED_TOKEN_ALPHABET) for _ in range(length))


def _stable_hash(text: str) -> int:
    """A process-stable 64-bit hash of ``text`` (FNV-1a).

    ``hash()`` is salted per-process, which would make a given seed token
    produce different games on every run. FNV-1a is tiny, dependency-free and
    deterministic, which is exactly what seeding needs.
    """
    h = 0xCBF29CE484222325
    for byte in text.encode("utf-8"):
        h ^= byte
        h = (h * 0x100000001B3) & 0xFFFFFFFFFFFFFFFF
    return h
