# Clue bank (empty)

Drop authored clue files here as `*.json`. Each file is a JSON **list** of clue
objects. See `server/app/data/clues.py` for the full schema, the three clue
types (`noise` / `redirect` / `thread`), and the per-game type ratio. Until at
least one file exists, the engine fabricates `[PLACEHOLDER]` clues so the round
structure and ratios can be exercised before real content is authored.

Minimal example (`marcus.json`):

```json
[
  {
    "character_key": "marcus_vale",
    "type": "thread",
    "text": "Marcus's car left the boathouse road just after midnight.",
    "location": "boathouse",
    "time_of_death": "midnight"
  },
  {
    "character_key": "marcus_vale",
    "type": "redirect",
    "text": "Marcus and Richard argued loudly at dinner."
  }
]
```

`location` and `time_of_death` are optional; omit them to make a clue eligible
in any scenario.
