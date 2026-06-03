"""Tests for the live game flow: stage progression, votes, and resolution."""

from app.engine import GameEngine
from app.game import (
    STAGE_FINAL_VOTE,
    STAGE_HOTSEAT_VOTE,
    STAGE_INTRODUCTIONS,
    STAGE_MINGLE,
    STAGE_OPENING,
    STAGE_REVEAL,
    STAGE_RULES,
    Game,
    Player,
    majority_winner,
)
from app.models import ROLE_INNOCENT


def make_game(n: int) -> Game:
    engine = GameEngine(bank_characters=[], bank_clues=[])
    game = Game(engine)
    game.start([Player(id=f"p{i}", name=f"P{i}") for i in range(n)])
    return game


def test_majority_winner_picks_unique_leader():
    assert majority_winner({"a": "x", "b": "x", "c": "y"}) == "x"


def test_majority_winner_returns_none_on_tie():
    assert majority_winner({"a": "x", "b": "y"}) is None
    assert majority_winner({}) is None


def test_start_enters_opening():
    game = make_game(5)
    assert game.stage == STAGE_OPENING
    assert game.content is not None
    assert len(game.narration) > 0  # the detective speaks


def test_walks_from_opening_to_first_round():
    game = make_game(5)
    game.advance()  # opening -> sheets
    game.advance()  # sheets -> introductions
    assert game.stage == STAGE_INTRODUCTIONS
    for _ in range(len(game.content.assignments)):
        game.advance()  # step through each introduction
    assert game.stage == STAGE_RULES
    game.advance()  # rules -> round 1 clue drop
    assert game.round_number == 1
    assert game.stage == "clue_drop"


def test_clue_drop_reveals_then_enters_mingle():
    game = make_game(4)
    _fast_forward_to_clue_drop(game)
    # Three clue reveals, then a fourth advance moves to mingle.
    for _ in range(3):
        game.advance()
    assert game.stage == "clue_drop"
    game.advance()
    assert game.stage == STAGE_MINGLE
    assert game.stage_ends_at is not None


def test_hotseat_vote_majority_enters_interrogation():
    game = make_game(5)
    _fast_forward_to_mingle(game)
    game.advance()  # mingle -> hotseat vote
    assert game.stage == STAGE_HOTSEAT_VOTE
    ids = [a.player_id for a in game.content.assignments]
    for pid in ids:  # everyone votes for ids[0]
        game.cast_hotseat_vote(pid, ids[0])
    game.advance()  # resolve
    assert game.stage == "interrogation"
    assert game.hotseat_target == ids[0]


def test_final_vote_correct_m_token_wins_for_4_5_players():
    game = make_game(4)
    _drive_to_final_vote(game)
    assert game.stage == STAGE_FINAL_VOTE
    murderer = game.content.murderer_id
    for a in game.content.assignments:
        game.place_token(a.player_id, "M", murderer)
    game.advance()  # resolve final vote
    assert game.stage == STAGE_REVEAL
    assert game.last_result["innocents_won"] is True


def test_final_vote_wrong_m_token_loses():
    game = make_game(4)
    _drive_to_final_vote(game)
    ids = [a.player_id for a in game.content.assignments]
    wrong = next(i for i in ids if i != game.content.murderer_id)
    for a in game.content.assignments:
        game.place_token(a.player_id, "M", wrong)
    game.advance()
    assert game.last_result["innocents_won"] is False


def test_six_player_needs_both_tokens_correct():
    game = make_game(6)
    _drive_to_final_vote(game)
    murderer = game.content.murderer_id
    accomplice = game.content.accomplice_id
    assert accomplice is not None
    # Correct murderer but reversed accomplice token -> loss (section 8).
    for a in game.content.assignments:
        game.place_token(a.player_id, "M", murderer)
        game.place_token(a.player_id, "A", murderer)  # wrong: A on the murderer
    game.advance()
    assert game.last_result["innocents_won"] is False

    # Now both correct -> win.
    game2 = make_game(6)
    _drive_to_final_vote(game2)
    for a in game2.content.assignments:
        game2.place_token(a.player_id, "M", game2.content.murderer_id)
        game2.place_token(a.player_id, "A", game2.content.accomplice_id)
    game2.advance()
    assert game2.last_result["innocents_won"] is True


def test_token_cannot_sit_on_same_player_for_both():
    game = make_game(6)
    _drive_to_final_vote(game)
    pid = game.content.assignments[0].player_id
    target = game.content.assignments[1].player_id
    game.place_token(pid, "M", target)
    game.place_token(pid, "A", target)  # rejected — must be a different name
    assert game.final_tokens[pid]["A"] is None


def test_emergency_vote_unanimous_correct_ends_game():
    game = make_game(5)
    _fast_forward_to_mingle(game)
    innocents = [a.player_id for a in game.content.assignments if a.role == ROLE_INNOCENT]
    murderer = game.content.murderer_id
    # Every innocent flags the murderer -> opens the 30s ballot.
    for pid in innocents:
        game.flag_emergency(pid, murderer)
    assert game.emergency_active is True
    for pid in innocents:
        game.cast_emergency_vote(pid, murderer)
    game.resolve_emergency_vote()
    assert game.stage == STAGE_REVEAL
    assert game.last_result["innocents_won"] is True


def test_murderer_cannot_flag_emergency():
    game = make_game(5)
    _fast_forward_to_mingle(game)
    murderer = game.content.murderer_id
    game.flag_emergency(murderer, murderer)
    assert murderer not in game.emergency_flags


# -- helpers ----------------------------------------------------------------
def _fast_forward_to_clue_drop(game: Game) -> None:
    game.advance()  # -> sheets
    game.advance()  # -> introductions
    for _ in range(len(game.content.assignments)):
        game.advance()
    game.advance()  # rules -> clue drop


def _fast_forward_to_mingle(game: Game) -> None:
    _fast_forward_to_clue_drop(game)
    for _ in range(4):  # three reveals + into mingle
        game.advance()
    assert game.stage == STAGE_MINGLE


def _run_one_round_to_next(game: Game) -> None:
    """From clue_drop, run reveals, mingle, skip hotseat (no votes), interrogation."""
    for _ in range(4):
        game.advance()  # reveals + mingle
    game.advance()  # mingle -> hotseat vote
    game.advance()  # hotseat (no votes -> skip) -> advances round/interrogation


def _drive_to_final_vote(game: Game) -> None:
    _fast_forward_to_clue_drop(game)
    # Round 1
    for _ in range(4):
        game.advance()
    game.advance()  # -> hotseat
    game.advance()  # no votes -> skip -> round 2 clue drop
    # Round 2
    for _ in range(4):
        game.advance()
    game.advance()  # -> hotseat
    game.advance()  # skip -> round 3 clue drop
    # Round 3
    for _ in range(4):
        game.advance()
    game.advance()  # -> hotseat
    game.advance()  # skip -> final vote
    assert game.stage == STAGE_FINAL_VOTE
