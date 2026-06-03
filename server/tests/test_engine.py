"""Tests for the generation engine (roles, rotation, clue ratios, determinism)."""

from app.data import clues as clue_data
from app.engine import GameEngine, has_accomplice, mingle_minutes_for
from app.models import ROLE_ACCOMPLICE, ROLE_INNOCENT, ROLE_MURDERER


def players(n: int) -> list[str]:
    return [f"p{i}" for i in range(n)]


def genders(ids):
    return {pid: "male" for pid in ids}


def test_mingle_timer_scales_with_player_count():
    assert mingle_minutes_for(4) == 2
    assert mingle_minutes_for(5) == 2
    assert mingle_minutes_for(7) == 3
    assert mingle_minutes_for(9) == 4
    assert mingle_minutes_for(10) == 5


def test_four_players_have_one_murderer_no_accomplice():
    engine = GameEngine(bank_characters=[], bank_clues=[])
    ids = players(4)
    content = engine.generate(ids, genders(ids), seed="SEED1")
    roles = [a.role for a in content.assignments]
    assert roles.count(ROLE_MURDERER) == 1
    assert roles.count(ROLE_ACCOMPLICE) == 0
    assert content.accomplice_id is None
    assert not has_accomplice(4)


def test_six_players_get_an_accomplice():
    engine = GameEngine(bank_characters=[], bank_clues=[])
    ids = players(6)
    content = engine.generate(ids, genders(ids), seed="SEED2")
    roles = [a.role for a in content.assignments]
    assert roles.count(ROLE_MURDERER) == 1
    assert roles.count(ROLE_ACCOMPLICE) == 1
    assert content.accomplice_id is not None


def test_fewer_than_four_players_is_rejected():
    engine = GameEngine(bank_characters=[], bank_clues=[])
    ids = players(3)
    try:
        engine.generate(ids, genders(ids))
        assert False, "expected ValueError"
    except ValueError:
        pass


def test_exactly_nine_clues_three_per_round_with_correct_ratios():
    engine = GameEngine(bank_characters=[], bank_clues=[])
    ids = players(8)
    content = engine.generate(ids, genders(ids), seed="SEED3")
    all_clues = [c for r in content.rounds for c in r.clues]
    assert len(content.rounds) == 3
    assert all(len(r.clues) == 3 for r in content.rounds)
    assert len(all_clues) == clue_data.CLUES_PER_GAME

    types = [c.type for c in all_clues]
    # Post-tamper ratio (section 11 bands): 2 noise / 4 redirect / 3 thread.
    assert types.count("thread") == 3
    assert types.count("redirect") == 4
    assert types.count("noise") == 2
    for r in content.rounds:
        assert sum(1 for c in r.clues if c.type == "thread") == 1


def test_round_two_is_tampered():
    engine = GameEngine(bank_characters=[], bank_clues=[])
    ids = players(8)
    content = engine.generate(ids, genders(ids), seed="SEED4")
    r2 = content.rounds[1]
    assert r2.tampered is True
    assert r2.replaced_in is not None
    assert r2.replaced_in.type == "redirect"
    # No noise should remain in the tampered round (it was swapped out).
    assert all(c.type != "noise" for c in r2.clues)


def test_generation_is_deterministic_for_a_seed():
    engine = GameEngine(bank_characters=[], bank_clues=[])
    ids = players(6)
    a = engine.generate(ids, genders(ids), seed="REPLAY")
    b = engine.generate(ids, genders(ids), seed="REPLAY")
    assert [x.role for x in a.assignments] == [x.role for x in b.assignments]
    assert a.location.key == b.location.key
    assert a.time.key == b.time.key
    assert [c.text for r in a.rounds for c in r.clues] == [c.text for r in b.rounds for c in r.clues]


def test_character_rotation_prefers_unused_keys():
    from app.data.characters import Character

    bank = [
        Character(
            key=f"c{i}", name_male=f"M{i}", name_female=f"F{i}", archetype="A",
            background="b", personality="p", relationship_with_richard="r",
            alibi="al", secret="s",
        )
        for i in range(8)
    ]
    engine = GameEngine(bank_characters=bank, bank_clues=[])
    ids = players(4)
    used = {"c0", "c1", "c2"}
    content = engine.generate(ids, genders(ids), used_character_keys=used, seed="ROT")
    chosen = {a.character.key for a in content.assignments}
    # With 5 fresh characters available for 4 seats, none of the used ones recur.
    assert chosen.isdisjoint(used)
