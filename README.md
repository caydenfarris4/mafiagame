# Dead in the Water

A digital companion for the **"Dead in the Water"** murder-mystery party game, built
for the Whitfield lake house weekend at **deadinthewater.caydenfarris.net**. Each guest logs in as their
character, reads their private dossier, walks the house scanning QR-code clues, and the
game master (Alexander) runs the five phases from a control dashboard.

Built with Next.js (App Router) + TypeScript + Tailwind + Prisma, deployed to
**Cloudflare Workers + D1** via OpenNext.

## What the app does

- **Players** log in with a personal code and get:
  - their private **character sheet** (dossier),
  - the shared **Last Night** timeline,
  - the current **search permit** (which rooms are open this phase),
  - their **found clues** (KEEP clues have a "Share with the house" button),
  - the **house feed** of public announcements,
  - **accusation ballots** when the GM opens a vote.
- **Scanning a clue QR** reveals it and is **phase-gated** (a Phase-4 clue won't open in
  Phase 2). **ANNOUNCE** clues auto-broadcast to everyone; **KEEP** clues stay private to
  the finder and only notify the GM.
- **Game master dashboard** (`/gm`, login `GM-ALEX`): a phase stepper (unlocks rooms),
  the scripted reveal + Solomon-line library (one tap pushes a line to all phones), a live
  discovery feed, the clue tracker, the suspect roster (with true roles), and the two
  accusation ballots with live tallies.
- **Printable QR sheet** (`/gm/qr`) grouped by phase — print, cut out, and hide.

Default logins (from the seed): GM `GM-ALEX`; players `HANK-01`, `CATHERINE-02`,
`VIVI-03`, `SEBASTIAN-04`, `BELLA-05`, `BEAU-06`, `EDEN-07`, `LEVI-08`, `CODY-09`.

## Local development

Local dev uses a SQLite file (`prisma/dev.db`) through Prisma's libSQL adapter.

```bash
npm install
npm run db:migrate    # create the local SQLite db
npm run db:seed       # load the game (prints all login codes)
npm run dev           # http://localhost:3000
```

Useful scripts: `npm run db:studio` (DB browser), `npm run db:reset` (drop + reseed).

## Architecture notes

- Prisma runs **engine-free** (no Rust binary), so it needs a driver adapter everywhere.
  There are two generated clients (see `prisma/schema.prisma`): the default Node client
  (used locally via libSQL) and a `workerd`-targeted client in `src/generated/prisma`
  (used on Cloudflare via the D1 adapter, loading its query-compiler WASM as a module).
- `src/lib/prisma.ts#getDb()` picks the right one: on Workers it binds to the request's
  D1 database; otherwise it uses the local libSQL file. All server code calls
  `await getDb()` rather than importing a shared instance.
- Sessions are signed cookies (`iron-session`), keyed to a per-character login code.

## Deploying to Cloudflare (deadinthewater.caydenfarris.net)

Prerequisites: a Cloudflare account and `npx wrangler login`.

**1. Create the D1 database** and paste the printed `database_id` into `wrangler.jsonc`
(replacing `REPLACE_WITH_YOUR_D1_DATABASE_ID`):

```bash
npx wrangler d1 create dead-in-the-water
```

**2. Apply the schema and seed to the remote D1:**

```bash
npm run d1:migrate:remote   # applies cf-migrations/0001_init.sql
npm run d1:seed:remote      # applies cf-seed.sql (the cast, clues, reveals)
```

> `cf-seed.sql` is committed and ready to use. To regenerate it (e.g. after editing the
> cast or clues in `prisma/seed.ts`), run `npm run db:reset && npm run db:export-d1`.

**3. Set the session secret** (32+ chars):

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))" | npx wrangler secret put SESSION_SECRET
```

`NEXT_PUBLIC_BASE_URL` is already set to `https://deadinthewater.caydenfarris.net` in `wrangler.jsonc`
(used to build the QR-code links).

**4. Deploy:**

```bash
npm run cf:deploy
```

**5. Point the domain.** In the Cloudflare dashboard, add `deadinthewater.caydenfarris.net` as a custom
domain / route for the Worker.

### Local Cloudflare preview (optional)

To run the exact Workers runtime locally against a local D1:

```bash
npm run d1:migrate:local
npm run d1:seed:local
echo 'SESSION_SECRET="local_dev_secret_at_least_32_characters"' > .dev.vars
npm run cf:preview
```

See `.env.example` for environment variables.
