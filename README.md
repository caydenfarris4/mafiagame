# Dead in the Water

A **Jackbox-style social-deduction party game** for 4–10 players, built to the
Game Design Document. One screen hosts the game (a TV or laptop); everyone else
plays from their phone by entering a 4-character room code — no app to install.
One player is secretly the murderer (two, with an accomplice, at 6+ players);
the room has ~30 minutes of clue drops, mingling, interrogations and votes to
catch them before the police arrive. A talking **Narrator** (the Detective)
drives the whole thing aloud on the TV.

Everything is **TypeScript on Cloudflare** — one deploy, one platform:

| Part | What it is |
| --- | --- |
| `src/app` (Next.js) | The **UI** — the TV screen (`/tv`) and the phone view (`/play`). Exported to static HTML/JS. |
| `src/worker` (Cloudflare Worker + Durable Object) | The **game server** — all state, the WebSocket, and the random generation engine. |

The Worker serves the static UI *and* routes `/ws` to a **Durable Object**
(Cloudflare's "one stays-alive object per room" primitive). Each room is one
Durable Object holding its game state and all the phones' WebSockets in memory —
no database. Same origin for UI and socket, so there's no CORS and nothing else
to host.

## Design highlights

- **No AI / API token anywhere.** Every scenario, role assignment and clue pull
  comes from a seedable PRNG (`src/worker/game/rng.ts`, `engine.ts`). Seeds make
  whole games reproducible and testable.
- **The Narrator talks.** Narrator lines are generated in the Worker and spoken
  on the TV with the browser's **Web Speech API** — audio, zero cost, no token,
  works offline.
- **Real-time.** TV and phones sync over one WebSocket per room, driving the
  live timers, the hidden hotseat votes, and the public live final-vote board.
  Timers are client-driven: the server sends an absolute `endsAt`, the TV counts
  down locally and advances at zero (the host can also skip).
- **Content is pluggable and not bundled.** The character and clue **banks ship
  empty** (`src/worker/game/data/characters.ts`, `clues.ts`) — only their types,
  loaders and selection rules are here. Fill the arrays and the game uses them;
  until then it runs end-to-end on clearly-labelled `[PLACEHOLDER]` content.

## Code map (`src/worker/game`)

| File | Role |
| --- | --- |
| `rng.ts` | Seedable PRNG + seed/room-code generation (the "tokens"). |
| `engine.ts` | Generation: roles, character rotation, scenario, clue pulls. |
| `game.ts` | The live state machine: stages, the 3-round loop, votes, reveal. |
| `serialize.ts` | Builds the TV vs. per-phone payloads (the trust boundary). |
| `narrator.ts` | The Detective's spoken lines. |
| `data/scenarios.ts` | Fixed death-location / time-of-death axes. |
| `data/characters.ts`, `data/clues.ts` | The **empty** banks you fill in. |
| `../GameRoom.ts` | The Durable Object: connections, sitting memory, broadcast. |
| `../index.ts` | Worker entry: routes `/ws` to a room, else serves the UI. |

## Run it locally

Two ways:

**Fast UI iteration** (hot reload, but no live game — `/ws` isn't served):

```bash
npm install
npm run dev          # http://localhost:3000
```

**The full game locally** (real Worker + Durable Object via Wrangler):

```bash
npm install
npm run preview      # builds the UI, then runs wrangler dev on :8787
```

Then open `http://localhost:8787` on the "TV", click **Host on this screen**,
and a room code appears. On each phone (or browser tab), open the same address,
enter the code, pick a name, and take a seat. With 4+ players the host can begin.

## How a game flows (GDD)

Lobby → Narrator opens (story + private character sheets) → Introductions (read
aloud from the TV) → Rules → **3 rounds** of *Clue Drop → Mingle → Hotseat Vote
→ Interrogation* → Final Vote (drag M/A tokens on a live public board) → the
Narrator reveals the truth. Round 2's clue drop is **tampered** by the murderer;
Round 3 grants the murderer a one-time **ban**; and once per game the innocents
can trigger a 30-second **Emergency Vote**.

## Adding characters and clues

The banks are intentionally empty. Open these files and push objects into the
arrays (each has the full type and an example in comments):

- `src/worker/game/data/characters.ts` — the designated cast (20–25 suggested).
- `src/worker/game/data/clues.ts` — clues tagged `noise` / `redirect` / `thread`,
  optionally scoped to a death location / time of death.

Rebuild/redeploy and the engine uses them automatically.

## Checks

```bash
npm run lint              # lint the whole repo
npm run typecheck:worker  # type-check the Worker + game engine
npm run build             # export the static UI to ./out
npx wrangler deploy --dry-run   # bundle + validate the Worker and bindings
```

## Deploying

One platform, one command:

```bash
npm run deploy   # next build (static export) + wrangler deploy
```

Durable Objects are included on the Workers Paid plan (and SQLite-backed DO
classes also work on Free). The `wrangler.jsonc` already declares the
`GameRoom` class and its migration, so the first deploy provisions everything.
After deploying, point your Cloudflare custom domain/route at the Worker.
