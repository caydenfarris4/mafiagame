"""Build the per-viewer state payloads broadcast over the socket.

Two audiences: the shared TV (``tv_state``) and an individual phone
(``player_state``). The split is also the trust boundary — private character
sheets and true roles only ever go to the one phone they belong to, never to the
TV. Hotseat votes stay hidden (GDD section 6); only the final vote is public
(section 8).
"""

from __future__ import annotations

import time

from .data.narrator import VICTIM
from .game import (
    STAGE_FINAL_VOTE,
    STAGE_INTRODUCTIONS,
    STAGE_LOBBY,
    STAGE_REVEAL,
    Game,
)
from .models import ROLE_ACCOMPLICE, ROLE_MURDERER


def _personas_public(game: Game) -> bool:
    """Persona names become public once introductions begin (section 4)."""
    return game.stage not in (STAGE_LOBBY, "opening", "sheets")


def roster(game: Game, players: dict[str, "object"]) -> list[dict]:
    """The list of players used for voting targets and the lobby.

    Shows handles before introductions, designated persona names after. Never
    leaks roles.
    """
    public = _personas_public(game)
    out = []
    for pid, p in players.items():
        entry = {"id": pid, "connected": getattr(p, "connected", True)}
        assignment = game.content.assignment_for(pid) if game.content else None
        if public and assignment:
            entry["name"] = assignment.display_name
            entry["archetype"] = assignment.character.archetype
        else:
            entry["name"] = getattr(p, "name", "Player")
        out.append(entry)
    return out


def _seconds_left(game: Game) -> float | None:
    if game.stage_ends_at is None:
        return None
    return max(0.0, round(game.stage_ends_at - time.time(), 1))


def tv_state(room) -> dict:
    """Everything the shared TV screen renders. No private data."""
    game: Game = room.game
    base = {
        "view": "tv",
        "roomCode": room.code,
        "stage": game.stage,
        "roundNumber": game.round_number,
        "narration": game.narration,
        "narrationSeq": game.narration_seq,
        "secondsLeft": _seconds_left(game),
        "players": roster(game, room.players),
        "playerCount": len(room.players),
        "sittingScores": room.sitting_scores,
        "gameNumber": room.game_number,
    }

    if game.content:
        base["scenario"] = {
            "location": game.content.location.name,
            "time": game.content.time.name,
            "timeWindow": game.content.time.window,
        }

    if game.stage == STAGE_INTRODUCTIONS and game.content:
        a = game.content.assignments[game.intro_index]
        base["introduction"] = _introduction(a)
        base["introIndex"] = game.intro_index
        base["introTotal"] = len(game.content.assignments)

    if game.stage in ("clue_drop", "mingle", "hotseat_vote", "interrogation") and game.content:
        rnd = game.content.rounds[game.round_number - 1]
        revealed = rnd.clues if game.stage != "clue_drop" else rnd.clues[: game.clue_reveal_index]
        base["clues"] = [{"text": c.text, "placeholder": c.is_placeholder} for c in revealed]
        base["tampered"] = rnd.tampered

    if game.stage == "hotseat_vote":
        # Public progress only — never who voted for whom (section 6).
        base["votesIn"] = len(game.hotseat_votes)
        base["hotseatTarget"] = game.hotseat_target
    if game.stage == "interrogation":
        base["hotseatName"] = game._player_persona(game.hotseat_target)

    if game.emergency_active:
        base["emergency"] = {
            "active": True,
            "votesIn": len(game.emergency_votes),
            "secondsLeft": _seconds_left(game),
        }

    if game.stage == STAGE_FINAL_VOTE and game.content:
        base["board"] = _final_board(game)
        base["hasAccomplice"] = game._game_has_accomplice()

    if game.stage == STAGE_REVEAL:
        base["result"] = game.last_result

    return base


def player_state(room, player_id: str) -> dict:
    """What one phone renders — including that player's private sheet."""
    game: Game = room.game
    p = room.players.get(player_id)
    base = {
        "view": "player",
        "roomCode": room.code,
        "stage": game.stage,
        "roundNumber": game.round_number,
        "playerId": player_id,
        "name": getattr(p, "name", "Player") if p else "Player",
        "secondsLeft": _seconds_left(game),
        "isHost": player_id == room.host_id,
    }
    if not game.content:
        base["players"] = roster(game, room.players)
        return base

    assignment = game.content.assignment_for(player_id)
    if assignment:
        base["sheet"] = _sheet(game, assignment)
        base["role"] = assignment.role

    base["players"] = [r for r in roster(game, room.players) if r["id"] != player_id]

    if game.stage == "hotseat_vote":
        base["myVote"] = game.hotseat_votes.get(player_id)
        base["bannedId"] = game.banned_player_id
        # The murderer gets the Round 3 ban control.
        if game.round_number == 3 and assignment and assignment.role == ROLE_MURDERER:
            base["canBan"] = not game.ban_used
            base["myBan"] = game.banned_player_id

    if game.stage == "mingle" and assignment and assignment.role not in (ROLE_MURDERER, ROLE_ACCOMPLICE):
        base["emergencyAvailable"] = not game.emergency_used and not game.emergency_active
        base["myEmergencyFlag"] = game.emergency_flags.get(player_id)

    if game.emergency_active:
        base["emergency"] = {"active": True, "myVote": game.emergency_votes.get(player_id)}

    if game.stage == STAGE_FINAL_VOTE:
        base["hasAccomplice"] = game._game_has_accomplice()
        base["myTokens"] = game.final_tokens.get(player_id, {"M": None, "A": None})
        base["board"] = _final_board(game)

    if game.stage == STAGE_REVEAL:
        base["result"] = game.last_result

    return base


# -- builders ---------------------------------------------------------------
def _introduction(assignment) -> dict:
    """GDD section 4 — the text a player reads aloud from the TV."""
    c = assignment.character
    return {
        "name": assignment.display_name,
        "archetype": c.archetype,
        "background": c.background,
        "personality": c.personality,
        # Framed as if everything with Richard was fine, alibi as fact.
        "relationship": c.relationship_with_richard,
        "alibi": c.alibi,
    }


def _sheet(game: Game, assignment) -> dict:
    """The private character sheet (section 3). Guilty roles get extra truth."""
    c = assignment.character
    sheet = {
        "name": assignment.display_name,
        "archetype": c.archetype,
        "background": c.background,
        "personality": c.personality,
        "relationship": c.relationship_with_richard,
        "alibi": c.alibi,
        "secret": c.secret,
        "role": assignment.role,
    }
    content = game.content
    if assignment.role == ROLE_MURDERER and content:
        sheet["theTruth"] = (
            f"You killed {VICTIM}. The clues all point your way — "
            "deflect, redirect, and survive the vote."
        )
        if content.accomplice_id:
            sheet["conspirator"] = game._player_persona(content.accomplice_id)
    if assignment.role == ROLE_ACCOMPLICE and content:
        sheet["conspirator"] = game._player_persona(content.murderer_id)
        sheet["theTruth"] = (
            "You helped cover it up. No clue points at you — your only tell is how "
            "you behave. Read the room and protect your partner."
        )
    return sheet


def _final_board(game: Game) -> list[dict]:
    """Live public M/A tally per player (section 8). Totals only, never voters."""
    m_counts = {}
    a_counts = {}
    for tokens in game.final_tokens.values():
        if tokens.get("M"):
            m_counts[tokens["M"]] = m_counts.get(tokens["M"], 0) + 1
        if tokens.get("A"):
            a_counts[tokens["A"]] = a_counts.get(tokens["A"], 0) + 1
    board = []
    for a in game.content.assignments:
        board.append({
            "id": a.player_id,
            "name": a.display_name,
            "M": m_counts.get(a.player_id, 0),
            "A": a_counts.get(a.player_id, 0),
        })
    return board
