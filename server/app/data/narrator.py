"""The Narrator (a Detective) — the lines spoken aloud on the TV.

These are produced server-side as plain strings and pushed to the TV, which
reads them with the browser's Web Speech API (no audio files, no API token).
The text is templated from game context (names, scenario, counts) so it always
uses *designated character names*, per the GDD design note in section 2.

Each helper returns a list of "beats": short sentences the TV speaks one after
another, so pacing and on-screen captions line up with the speech.
"""

from __future__ import annotations

from ..data.scenarios import DeathLocation, TimeOfDeath

VICTIM = "Richard"


def opening(num_players: int, has_accomplice: bool, location: DeathLocation,
            time: TimeOfDeath) -> list[str]:
    """GDD section 3 — the opening sequence before character sheets are read."""
    beats = [
        f"Good evening. I am the detective assigned to this case, and I am afraid the news is not good.",
        f"{VICTIM} is dead.",
        f"He was found at {location.name.lower()}, sometime around {time.name.lower()}.",
        "Every single person in this room had a reason to want him gone. A motive. Each of you.",
        "But only one of you acted on it.",
    ]
    if has_accomplice:
        beats.append(
            "And given the circumstances, I believe two people worked together to carry out this murder."
        )
    beats.append(
        "Before anyone says a word, read your character sheet. Privately. Then we begin."
    )
    return beats


def rules_explainer(mingle_minutes: int) -> list[str]:
    """GDD section 5 — narrator walks through how the game works."""
    return [
        "Here is how this will go.",
        "We play three rounds. Each round has four parts.",
        "First, the clue drop. I will reveal three pieces of evidence.",
        f"Then the mingle phase. You will have {mingle_minutes} minutes to move, talk, and accuse in private.",
        "Then a hotseat vote. You will choose, on your phones, who to interrogate.",
        "Then the interrogation itself. Open floor. Anyone may ask anything.",
        "That loop repeats three times.",
        "Once per game, if every innocent agrees, you may call an emergency vote.",
        "If you are innocent, help me find the murderer.",
        "If you are the murderer — go unnoticed, and get away with it.",
    ]


def clue_drop_intro(round_number: int, tampered: bool) -> list[str]:
    """GDD section 6 — narrator introduces the three clues one by one."""
    if tampered:
        return [
            f"Round {round_number}. New evidence.",
            "But something is wrong.",
            "The culprit has tampered with the evidence. One clue has been replaced.",
            "Three pieces. Here is the first.",
        ]
    return [
        f"Round {round_number}. Three new pieces of evidence.",
        "Listen carefully. Here is the first.",
    ]


def clue_reveal(index: int, text: str) -> list[str]:
    """A single clue being read aloud as it appears on screen."""
    ordinals = ["The first.", "The second.", "And the last."]
    label = ordinals[index] if index < len(ordinals) else f"Clue {index + 1}."
    return [label, text]


def hotseat_result(name: str | None) -> list[str]:
    """GDD section 6 — outcome of the hotseat vote."""
    if name is None:
        return ["No majority. No one takes the hotseat this round. We move on."]
    return [f"The room has spoken. {name}, take the hotseat."]


def ban_blocked(name: str) -> list[str]:
    """GDD section 6 — Round 3 murderer ban hit the majority target."""
    return [
        f"The culprit has blocked {name} from interrogation.",
        f"You will vote again — and this time, {name} is off the table.",
    ]


def ban_wasted(attempted: str, actual: str) -> list[str]:
    """GDD section 6 — the ban missed the majority target."""
    return [
        f"The culprit attempted to block {attempted}, but the group voted for {actual}.",
        f"{actual}, take the hotseat.",
    ]


def final_vote_open() -> list[str]:
    """GDD section 8 — the detective opens the final vote."""
    return [
        "The police have arrived.",
        "It's time. Who should they arrest?",
        "You have sixty seconds. Place your tokens. You may change them until the clock runs out.",
    ]


def reveal(murderer: str, accomplice: str | None, innocents_won: bool) -> list[str]:
    """GDD section 8 — the narrator reveals the full truth, win or lose."""
    beats: list[str] = []
    if innocents_won:
        beats.append("You got it right.")
    else:
        beats.append("I'm afraid you got it wrong.")
    if accomplice:
        beats.append(f"{murderer} killed {VICTIM}. And {accomplice} helped cover it up.")
    else:
        beats.append(f"{murderer} killed {VICTIM}.")
    if innocents_won:
        beats.append("Justice, for once, is served. The case is closed.")
    else:
        beats.append("And tonight, the killer walks free.")
    return beats
