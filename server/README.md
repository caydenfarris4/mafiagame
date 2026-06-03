# Dead in the Water — game server (Python)

The real-time game server and the random-generation engine from the Game Design
Document. It owns all game state and pushes per-viewer updates to the Next.js
frontend (the shared TV and each phone) over a single WebSocket. No AI / API
token is used anywhere — every scenario, role, and clue pull comes from the
seedable Python RNG in `app/rng.py`.

## Layout

| Path | What it is |
| --- | --- |
| `app/rng.py` | Seedable random source + seed-token generation (the "tokens"). |
| `app/engine.py` | Generation engine: roles, character rotation, scenario, clue pulls. |
| `app/game.py` | The live state machine: phases, the 3-round loop, votes, reveal. |
| `app/serialize.py` | Builds the TV vs. per-phone payloads (the trust boundary). |
| `app/rooms.py` | Rooms, connections, sitting memory, and the stage timers. |
| `app/main.py` | FastAPI app + the `/ws` WebSocket endpoint. |
| `app/data/scenarios.py` | The fixed death-location / time-of-death axes. |
| `app/data/characters.py` | Character bank **schema + loader** (bank ships empty). |
| `app/data/clues.py` | Clue bank **schema + loader** (bank ships empty). |
| `app/data/narrator.py` | The Detective's spoken lines (read aloud via Web Speech). |
| `app/data/banks/` | Drop authored `*.json` character/clue files here. |

The character and clue **content** is intentionally not included — see the
READMEs under `app/data/banks/`. Until you add files there, the engine runs the
full game with clearly-labelled `[PLACEHOLDER]` content.

## Run it

```bash
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

The WebSocket is then at `ws://localhost:8000/ws` and a health check at
`http://localhost:8000/health`. Point the frontend at it with
`NEXT_PUBLIC_GAME_WS_URL=ws://localhost:8000/ws`.

## Tests

```bash
cd server
pip install -r requirements.txt
python3 -m pytest -q
```

`tests/test_engine.py` covers role assignment, character rotation, clue ratios
and determinism; `tests/test_game.py` covers stage progression, hotseat and
final-vote resolution, and the emergency vote.

## WebSocket protocol (summary)

First message picks the role:

- TV: `{ "type": "create" }` → server returns a `roomCode`. Controls:
  `{"type":"start"}`, `{"type":"advance"}`, `{"type":"next_game"}`.
- Phone: `{ "type": "join", "code": "ABCD", "name": "...", "gender": "male|female" }`
  → server returns `{ "type": "joined", "playerId": "..." }`. Actions:
  `hotseat_vote`, `set_ban`, `place_token`, `emergency_flag`, `emergency_vote`,
  and `update` (lobby name/gender).

After every action the server broadcasts a fresh state object to each viewer
(`view: "tv"` or `view: "player"`); the client just renders the latest one.
