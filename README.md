# Mafia at Campus Home

An interactive Mafia/Clue game for a house full of friends, intended for
**campushome.us**. Each person logs in as their own character, walks around the
house, and scans QR codes to uncover clues. Secret clues are private to the
finder (the game master is notified); public clues can be released to everyone
as announcements.

Built with Next.js (App Router) + TypeScript + Tailwind + Prisma.

## Quick start

```bash
npm install
npm run db:migrate   # creates the local SQLite db and applies migrations
npm run db:seed      # loads a sample game, characters, and clues
npm run dev          # http://localhost:3000
```

The seed prints the login codes. By default:

| Character | Role      | Login code |
| --------- | --------- | ---------- |
| The Host  | Game Master | `GM-MASTER` |
| Scarlet   | Mafia     | `SCARLET-1` |
| Mustard   | Civilian  | `MUSTARD-2` |
| Plum      | Detective | `PLUM-3`    |
| Green     | Civilian  | `GREEN-4`   |

## How it works

- **Login** (`/`): each player enters their personal code. The game master is
  redirected to `/gm`; everyone else lands on `/play`.
- **Player dashboard** (`/play`): shows your character, the clues *you* have
  found, and any public announcements the game master has released. Players
  never see what other players have found. Polls for updates every 5s.
- **Scanning a clue** (`/clue/[token]`): the QR codes link here. Scanning
  records the discovery for the logged-in player and reveals the clue. If not
  logged in, the player is sent to log in first and then returned to the clue.
- **Game master dashboard** (`/gm`): a live, auto-refreshing feed of every clue
  discovery (who found what, where, and when), the clue list with discovery
  counts, and a roster of suspects. PUBLIC clues have a **Release** toggle that
  makes them appear as announcements on every player's dashboard.
- **QR sheet** (`/gm/qr`): print-ready QR codes for every clue, each linking to
  its `/clue/[token]` URL. Print, cut out, and hide them around the house.

### Clue visibility

- **SECRET** — only the finder sees the content; the game master is notified.
- **PUBLIC** — intended to be announced to the whole house. It is only shown in
  everyone's feed once the game master toggles **Release** (so you control
  timing, e.g. "the body is found at 9 PM").

## Editing the game

For now, characters and clues live in `prisma/seed.ts`. Edit that file and run
`npm run db:reset` (wipes + re-seeds) to change the cast or the clues. A
game-master editing UI is a natural next step.

Useful scripts:

- `npm run db:studio` — visual DB browser (Prisma Studio)
- `npm run db:reset` — drop, re-migrate, and re-seed the local DB

## Deploying to Vercel (campushome.us)

The dev database is SQLite, which does **not** persist on Vercel's serverless
runtime. For production you need a hosted Postgres:

1. Create a Postgres database (Vercel Postgres, Neon, or Supabase).
2. In `prisma/schema.prisma`, change the datasource provider:
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. Set these environment variables in Vercel:
   - `DATABASE_URL` — the Postgres connection string
   - `SESSION_SECRET` — a 32+ character random string
     (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)
   - `NEXT_PUBLIC_BASE_URL` — `https://campushome.us` (used to build QR links)
4. Run `npx prisma migrate deploy` against the production database, then seed it.
5. Point the `campushome.us` domain at the Vercel project.

See `.env.example` for the full list of environment variables.
