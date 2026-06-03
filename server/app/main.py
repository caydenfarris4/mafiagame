"""FastAPI app: the Dead in the Water game server.

Two websocket roles share one endpoint, distinguished by the first message:
- the **TV** (shared screen) creates a room and drives stage advancement;
- a **phone** joins with the room code and takes player actions.

Everything is in-memory and event-driven; the room layer broadcasts fresh
per-viewer state after every action. The Next.js frontend is the only client.
"""

from __future__ import annotations

import uuid

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from .rooms import Room, RoomManager
from .serialize import player_state, tv_state

app = FastAPI(title="Dead in the Water — game server")

# The Next.js client runs on a different origin in dev; allow it to connect.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

manager = RoomManager()


@app.get("/health")
async def health() -> dict:
    return {"ok": True, "rooms": len(manager.rooms)}


@app.websocket("/ws")
async def ws_endpoint(socket: WebSocket) -> None:
    await socket.accept()
    role: str | None = None
    room: Room | None = None
    player_id: str | None = None
    try:
        while True:
            msg = await socket.receive_json()
            kind = msg.get("type")

            # -- TV (shared screen) -----------------------------------------
            if kind == "create":
                room = manager.create_room()
                room.tv_sockets.add(socket)
                role = "tv"
                await socket.send_json(tv_state(room))
                continue
            if kind == "reconnect_tv":
                room = manager.get(msg.get("code", ""))
                if not room:
                    await _err(socket, "Room not found.")
                    continue
                room.tv_sockets.add(socket)
                role = "tv"
                await socket.send_json(tv_state(room))
                continue

            # -- phone join -------------------------------------------------
            if kind == "join":
                room = manager.get(msg.get("code", ""))
                if not room:
                    await _err(socket, "Room not found. Check the code.")
                    continue
                if room.game.stage != "lobby":
                    await _err(socket, "That game has already started.")
                    continue
                player_id = msg.get("playerId") or uuid.uuid4().hex[:8]
                room.add_player(player_id, msg.get("name") or "Player", msg.get("gender") or "male")
                room.player_sockets[player_id] = socket
                role = "player"
                await socket.send_json({"type": "joined", "playerId": player_id, "roomCode": room.code})
                await room.broadcast()
                continue
            if kind == "reconnect":
                room = manager.get(msg.get("code", ""))
                player_id = msg.get("playerId")
                if not room or player_id not in room.players:
                    await _err(socket, "Could not rejoin that game.")
                    continue
                room.players[player_id].connected = True
                room.player_sockets[player_id] = socket
                role = "player"
                await socket.send_json({"type": "joined", "playerId": player_id, "roomCode": room.code})
                await room.broadcast()
                continue

            # Everything past here needs an established room.
            if room is None:
                await _err(socket, "Not in a room yet.")
                continue

            await _handle_action(room, role, player_id, msg)
    except WebSocketDisconnect:
        pass
    finally:
        _cleanup(room, role, player_id, socket)


async def _handle_action(room: Room, role: str | None, player_id: str | None, msg: dict) -> None:
    kind = msg["type"]
    game = room.game

    # TV-only controls.
    if role == "tv":
        if kind == "start":
            if len(room.players) < 4:
                await _err_tv(room, "Need at least 4 players to begin.")
                return
            room.start_game()
        elif kind == "advance":
            game.advance()
            room.maybe_finalize()
        elif kind == "next_game":
            room.start_game()
        room.arm_stage_timer()
        await room.broadcast()
        return

    # Player actions.
    if role == "player" and player_id:
        if kind == "update" and game.stage == "lobby":
            p = room.players.get(player_id)
            if p:
                p.name = msg.get("name", p.name)
                p.gender = msg.get("gender", p.gender)
        elif kind == "hotseat_vote":
            game.cast_hotseat_vote(player_id, msg["target"])
        elif kind == "set_ban":
            game.set_ban(player_id, msg.get("target"))
        elif kind == "place_token":
            game.place_token(player_id, msg["token"], msg.get("target"))
        elif kind == "emergency_flag":
            game.flag_emergency(player_id, msg.get("target"))
        elif kind == "emergency_vote":
            game.cast_emergency_vote(player_id, msg["target"])
        room.maybe_finalize()
        room.arm_stage_timer()
        await room.broadcast()


def _cleanup(room: Room | None, role: str | None, player_id: str | None, socket: WebSocket) -> None:
    if not room:
        return
    if role == "tv":
        room.tv_sockets.discard(socket)
    elif role == "player" and player_id:
        room.player_sockets.pop(player_id, None)
        room.mark_disconnected(player_id)
    if room.empty():
        manager.remove(room.code)


async def _err(socket: WebSocket, message: str) -> None:
    await socket.send_json({"type": "error", "message": message})


async def _err_tv(room: Room, message: str) -> None:
    for sock in list(room.tv_sockets):
        try:
            await sock.send_json({"type": "error", "message": message})
        except Exception:
            pass
