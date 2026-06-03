"""Tests for the room layer + serialization (the TV/phone trust boundary)."""

from app.rooms import RoomManager
from app.serialize import player_state, tv_state


def seat(room, n):
    for i in range(n):
        room.add_player(f"p{i}", f"P{i}", "female" if i % 2 else "male")


def test_room_codes_are_four_chars_and_unique():
    mgr = RoomManager()
    codes = {mgr.create_room().code for _ in range(20)}
    assert len(codes) == 20
    assert all(len(c) == 4 for c in codes)


def test_lobby_hides_personas_and_roles():
    mgr = RoomManager()
    room = mgr.create_room()
    seat(room, 4)
    tv = tv_state(room)
    assert tv["stage"] == "lobby"
    assert tv["playerCount"] == 4
    # Names in the lobby are the players' handles, never personas/roles.
    assert {p["name"] for p in tv["players"]} == {"P0", "P1", "P2", "P3"}
    for p in tv["players"]:
        assert "role" not in p


def test_private_sheet_only_goes_to_its_owner():
    mgr = RoomManager()
    room = mgr.create_room()
    seat(room, 6)
    room.start_game()
    # Each phone sees its own role; the TV state never carries any role/sheet.
    tv = tv_state(room)
    assert "sheet" not in tv
    roles = {pid: player_state(room, pid).get("role") for pid in room.players}
    assert list(roles.values()).count("murderer") == 1
    assert list(roles.values()).count("accomplice") == 1
    # The murderer's sheet names their conspirator; innocents' sheets do not.
    murderer = next(pid for pid, r in roles.items() if r == "murderer")
    innocent = next(pid for pid, r in roles.items() if r == "innocent")
    assert player_state(room, murderer)["sheet"].get("conspirator")
    assert "conspirator" not in player_state(room, innocent)["sheet"]


def test_sitting_memory_rotates_and_scores():
    mgr = RoomManager()
    room = mgr.create_room()
    seat(room, 5)
    room.start_game()
    first_keys = room.game.character_keys_used()
    # Force a known result and finalize.
    room.game.stage = "reveal"
    room.game.last_result = {"innocents_won": True, "murderer": "x", "accomplice": None}
    room.maybe_finalize()
    assert room.used_character_keys == first_keys  # folded into sitting memory
    assert sum(room.sitting_scores.values()) > 0  # innocents scored a point
    # Finalizing again is a no-op (no double scoring).
    before = dict(room.sitting_scores)
    room.maybe_finalize()
    assert room.sitting_scores == before
