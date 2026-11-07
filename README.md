# OpenStake

OpenStake is a server-authoritative, play-money originals floor with the visual language of a private casino. There are no deposits, withdrawals, real-money wagers or prizes.

## The floor

Ten original games share one wallet, one seed system and one design language:

- **Blackjack** — six decks, 3:2 naturals, dealer stands on soft 17, doubles, splits and insurance
- **Dice** — choose a side and a win chance
- **Limbo** — pick a target multiplier
- **Plinko** — five row counts and three risk levels
- **Mines** — reveal gems and cash out before the board turns
- **Keno** — pick up to ten numbers across three risk levels
- **Wheel** — five segment counts and three risk levels
- **HiLo** — call the next card and build a multiplier
- **Dragon Tower** — climb nine floors of eggs and dragons
- **Chicken Cross** — cross twelve lanes and cash out before traffic

Instant games settle in a single request. Table and progression games use an explicit state machine with server-side legal actions. The client sends intents and renders public state; it never generates an outcome, changes a shoe or mutates a balance.

## Platform

- First-visit seat setup: display name, avatar preset or uploaded photo, no password or email
- Automatic temporary guest seats that live in the browser session
- $100 starting balance and an instant top-up to $100 whenever the balance drops below target
- Ledger wallet with idempotent bets, transactional row locks and refunds
- Provably fair seed pairs with SHA-256 commitments and HMAC-SHA256 outcomes
- Per-round verification data, recent bets and previous seed pairs
- Leaderboard and live feed driven entirely by real player activity
- Responsive dark interface with original OpenStake art direction
- No source comments: naming, types, tests and structure carry the intent

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4 with a token-driven design system
- Radix UI primitives, class-variance-authority and Sonner for accessible interface components
- Motion and Lucide for movement and iconography
- TanStack Query
- PostgreSQL-compatible PGlite for a zero-setup local database
- Drizzle ORM and SQL migrations
- Vitest for engine and rules tests

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Generate two secrets for `.env.local`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Use the first for `SESSION_SECRET` and the second for `SEED_ENCRYPTION_KEY`.

Open `http://localhost:3000`. The PGlite database is created in `.data/pglite` and migrations are applied on first access.

## Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run typecheck
npm test
npm run db:generate
npm run db:migrate
```

## Architecture

```text
src/
  app/                 routes and route handlers
  components/
    casino/            shell, lobby, game tiles, live feed and table preview
    games/             shared game shell, controls, history and each game
    ui/                Radix-based primitives and design-system components
    onboarding/        first-visit seat setup dialog
    avatars/           avatar picker with preset and photo upload
  modules/
    games/             catalog, cards, instant engines, stateful engines, paytables
    betting/           bet orchestration and wallet settlement
    wallet/            ledger, faucet and money primitives
    fairness/          seed pair lifecycle
    identity/          temporary seats, player profiles and avatar presets
    leaderboard/       ranking and transaction history
    realtime/          event bus and live bet feed
  platform/
    auth/              signed guest sessions
    db/                Drizzle schema, migrations and PGlite client
    container.ts       dependency-injection composition root
  lib/                 money, ids, errors and fairness utilities
```

### Patterns

- **Strategy**: every instant game implements `InstantGameDefinition`; every table game implements `ProgressionEngine`. The betting service orchestrates both without game-specific branches.
- **Dependency injection**: `platform/container.ts` wires services; engines receive a `RandomSource`, wallets use a `Clock` and `IdGenerator`, and tests inject scripted decks and boards.
- **Repository and unit of work**: every wallet mutation runs through Drizzle transactions with `FOR UPDATE` locks and ledger entries.
- **State machine**: progression games expose explicit legal actions, phase data and settlement snapshots.
- **Observer**: the realtime event bus drives the SSE live feed without coupling engines to HTTP.
- **Design system**: Radix primitives and CVA variants keep interaction and appearance consistent across the shell, tables and account pages.

## Fairness

Each guest receives a server seed, its SHA-256 hash and an editable client seed. Every bet stores the seed pair, client seed snapshot, nonce and game input. Outcomes are drawn from HMAC-SHA256 floats:

```text
HMAC-SHA256(serverSeed, clientSeed:nonce:cursor)
```

Rotating a seed pair reveals the previous server seed on the fairness page. The same page lists recent rounds and returns the full verification payload once the seed is revealed.

## Live feed

The live feed and the leaderboard read only from real player sessions. There are no simulated players,
seeded personas or background bots in the product.

## Database note

PGlite keeps the project self-contained and runs the PostgreSQL dialect locally. The schema and migrations are portable to PostgreSQL. For multi-instance production, move to PostgreSQL and a shared pub/sub layer for the realtime gateway.

## Scope

Sportsbook, live-dealer video, third-party licensed content and real-money wagering are intentionally out of scope. This is a play-money product and a full-stack engineering showcase.
