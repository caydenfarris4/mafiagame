# Dead in the Water

A **Jackbox-style social-deduction party game** for 4–10 players, built to the
[Game Design Document](#). One screen hosts the game (a TV or laptop); everyone
else plays from their phone by entering a 4-character room code — no app to
install. One player is secretly the murderer (two, with an accomplice, at 6+
players); the room has ~30 minutes of clue drops, mingling, interrogations and
votes to catch them before the police arrive. A talking **Narrator** (the
Detective) drives the whole thing aloud on the TV.

This repo has two parts:

| Part | Stack | Role |
| --- | --- | --- |
| `./` (Next.js) | Next.js 16 + TypeScript + Tailwind | The **client** — the TV screen and the phone views. |
| `./server` (Python) | FastAPI + WebSockets | The **game server** — all state, plus the random scenario/role/clue **generation engine**. |

The two talk over a single WebSocket. The server is authoritative; the client
just renders the latest state and sends player actions.

## Design highlights

- **No AI / API token anywhere.** Every scenario, role assignment and clue pull
  is produced by a seedable, pure-Python RNG (`server/app/rng.py`,
  `server/app/engine.py`). Seeds make whole games reproducible and testable.
- **The Narrator talks.** Narrator lines are generated server-side and spoken on
  the TV with the browser's built-in **Web Speech API** — audio, zero cost, no
  token, works offline.
- **Real-time.** TV and phones stay in sync over WebSockets, which drives live
  timers, the hidden hotseat votes, and the public live final-vote board.
- **Content is pluggable and not bundled.** The character and clue **banks ship
  empty** — only their schema, loaders and selection rules are here. Drop
  authored JSON into `server/app/data/banks/` to fill them; until then the game
  runs end-to-end on clearly-labelled `[PLACEHOLDER]` content. See
  `server/README.md`.

## Run it locally

**1. Start the game server** (Python 3.10+):

```bash
cd server
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**2. Start the client** (in another terminal):

```bash
npm install
echo 'NEXT_PUBLIC_GAME_WS_URL="ws://localhost:8000/ws"' > .env.local
npm run dev          # http://localhost:3000
```

**3. Play.** Open `http://localhost:3000` on the "TV" (any browser), click
**Host on this screen**, and a room code appears. On each phone, open the same
site, enter the code, pick a name, and take a seat. With 4+ players the host can
begin.

## How a game flows (GDD)

Lobby → Narrator opens (story + private character sheets) → Introductions (read
aloud from the TV) → Rules → **3 rounds** of *Clue Drop → Mingle → Hotseat Vote
→ Interrogation* → Final Vote (drag M/A tokens on a live public board) → the
Narrator reveals the truth. Round 2's clue drop is **tampered** by the murderer;
Round 3 grants the murderer a one-time **ban**; and once per game the innocents
can trigger a 30-second **Emergency Vote**.

## Adding characters and clues

The banks are intentionally empty. To author content, drop JSON files into:

- `server/app/data/banks/characters/` — the designated cast (20–25 suggested).
- `server/app/data/banks/clues/` — the clue bank, tagged `noise` / `redirect` /
  `thread` and optionally scoped to a death location / time of death.

Each directory has a README with the exact schema and an example. The engine
picks up new files on restart.

## Tests

```bash
cd server && python3 -m pytest -q
```

Covers role assignment, character rotation, clue ratios, determinism, stage
progression, and vote resolution (hotseat, final M/A tokens, emergency vote).

## Deploying

- **Client:** deploys to Cloudflare Workers via OpenNext (`npm run cf:deploy`).
  Set `NEXT_PUBLIC_GAME_WS_URL` (in `wrangler.jsonc` vars) to your server's
  public `wss://…/ws`.
- **Server:** a long-lived Python WebSocket process — host it anywhere that runs
  one (Render, Fly.io, Railway, a VPS). Cloudflare Workers can't host it, hence
  the split.
