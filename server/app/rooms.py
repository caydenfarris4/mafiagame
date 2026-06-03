"""Rooms — connection management, sitting state, and timed-stage driving.

A :class:`Room` owns the player list, the live :class:`Game`, the websocket
connections, and the sitting-level memory (cross-game character rotation and the
running scoreboard, GDD section 12). It also runs the asyncio timers that auto-
advance timed stages (mingle, interrogation, final vote, emergency vote).
"""

from __future__ import annotations

import asyncio
from typing import TYPE_CHECKING

from .engine import GameEngine
from .game import (
    EMERGENCY_VOTE_SECONDS,
    STAGE_FINAL_VOTE,
    STAGE_INTERROGATION,
    STAGE_MINGLE,
    Game,
    Player,
)
from .rng import GameRNG
from .serialize import player_state, tv_state

if TYPE_CHECKING:  # avoid importing the web framework into the pure game core
    from fastapi import WebSocket


class Room:
    def __init__(self, code: str, engine: GameEngine):
        self.code = code
        self.engine = engine
        self.players: dict[str, Player] = {}
        self.host_id: str | None = None  # the phone that created the room
        self.game = Game(engine)

        # Sockets: one TV connection (the shared screen) + one per phone.
        self.tv_sockets: set["WebSocket"] = set()
        self.player_sockets: dict[str, "WebSocket"] = {}

        # Sitting memory (persists across games in the room).
        self.game_number: int = 0
        self.used_character_keys: set[str] = set()
        self.sitting_scores: dict[str, int] = {}

        self._timer: asyncio.Task | None = None
        self._lock = asyncio.Lock()
        self._scored: set[int] = set()  # game numbers already folded into the score

    # -- players ------------------------------------------------------------
    def add_player(self, player_id: str, name: str, gender: str) -> Player:
        existing = self.players.get(player_id)
        if existing:  # reconnect — keep their seat
            existing.connected = True
            return existing
        player = Player(id=player_id, name=name, gender=gender)
        self.players[player_id] = player
        if self.host_id is None:
            self.host_id = player_id
        return player

    def mark_disconnected(self, player_id: str) -> None:
        if player_id in self.players:
            self.players[player_id].connected = False

    # -- game control -------------------------------------------------------
    def start_game(self) -> None:
        """Begin a (re)generated game, carrying sitting memory forward."""
        self.game_number += 1
        self.game = Game(self.engine, used_character_keys=set(self.used_character_keys))
        self.game.start(list(self.players.values()))

    def maybe_finalize(self) -> None:
        """Fold a finished game into sitting memory + score, exactly once.

        Safe to call after any advance or timer tick; it only acts the first
        time a given game reaches the reveal stage.
        """
        from .game import STAGE_REVEAL

        if self.game.stage != STAGE_REVEAL or self.game_number in self._scored:
            return
        self._scored.add(self.game_number)
        self.used_character_keys |= self.game.character_keys_used()
        result = self.game.last_result
        if result and result.get("innocents_won"):
            for pid in self.players:
                if self.game._role_of(pid) == "innocent":
                    self.sitting_scores[pid] = self.sitting_scores.get(pid, 0) + 1

    # -- broadcasting -------------------------------------------------------
    async def broadcast(self) -> None:
        """Push fresh state to the TV and every phone."""
        tv = tv_state(self)
        dead_tv = []
        for sock in list(self.tv_sockets):
            if not await _safe_send(sock, tv):
                dead_tv.append(sock)
        for sock in dead_tv:
            self.tv_sockets.discard(sock)

        for pid, sock in list(self.player_sockets.items()):
            if not await _safe_send(sock, player_state(self, pid)):
                self.mark_disconnected(pid)

    # -- timed stages -------------------------------------------------------
    def arm_stage_timer(self) -> None:
        """(Re)start the auto-advance timer for the current timed stage."""
        if self._timer and not self._timer.done():
            self._timer.cancel()
        if self.game.stage_ends_at is None and not self.game.emergency_active:
            return
        self._timer = asyncio.create_task(self._run_timer())

    async def _run_timer(self) -> None:
        import time as _time

        try:
            while True:
                ends = self.game.stage_ends_at
                if ends is None:
                    return
                remaining = ends - _time.time()
                if remaining <= 0:
                    break
                # Wake at the deadline, but at least once a second so the TV's
                # countdown and vote board stay live.
                await asyncio.sleep(min(remaining, 1.0))
                await self.broadcast()
        except asyncio.CancelledError:
            return
        await self._on_timer_expired()

    async def _on_timer_expired(self) -> None:
        async with self._lock:
            if self.game.emergency_active:
                self.game.resolve_emergency_vote()
            elif self.game.stage == STAGE_MINGLE:
                self.game.advance()  # → hotseat vote
            elif self.game.stage == STAGE_INTERROGATION:
                self.game.advance()  # → next round / final vote
            elif self.game.stage == STAGE_FINAL_VOTE:
                self.game.advance()  # → reveal
            self.maybe_finalize()
        self.arm_stage_timer()
        await self.broadcast()

    def empty(self) -> bool:
        return not self.tv_sockets and not self.player_sockets


class RoomManager:
    """Process-wide registry of active rooms, keyed by room code."""

    def __init__(self):
        self.engine = GameEngine()
        self.rooms: dict[str, Room] = {}
        self._rng = GameRNG()

    def create_room(self) -> Room:
        code = self._unique_code()
        room = Room(code, self.engine)
        self.rooms[code] = room
        return room

    def get(self, code: str) -> Room | None:
        return self.rooms.get(code.upper())

    def remove(self, code: str) -> None:
        self.rooms.pop(code.upper(), None)

    def _unique_code(self) -> str:
        for _ in range(50):
            code = self._rng.room_code()
            if code not in self.rooms:
                return code
        raise RuntimeError("could not allocate a unique room code")


async def _safe_send(sock: "WebSocket", payload: dict) -> bool:
    try:
        await sock.send_json(payload)
        return True
    except Exception:
        return False
