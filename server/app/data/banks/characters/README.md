# Character bank (empty)

Drop authored character files here as `*.json`. Each file is a JSON **list** of
character objects. See `server/app/data/characters.py` for the full schema and
required fields. Until at least one file exists, the engine substitutes
clearly-labelled `[PLACEHOLDER]` suspects so the whole game flow still runs.

Minimal example (`cast.json`):

```json
[
  {
    "key": "marcus_vale",
    "name_male": "Marcus Vale",
    "name_female": "Marcia Vale",
    "archetype": "The Business Partner",
    "background": "Co-founded the firm with Richard two decades ago.",
    "personality": "Polished, controlled, allergic to a straight answer.",
    "relationship_with_richard": "Business partners — lately, rivals.",
    "alibi": "Says he was on a call in the study all evening.",
    "secret": "Richard was about to buy him out for pennies.",
    "candor": 0.4
  }
]
```
