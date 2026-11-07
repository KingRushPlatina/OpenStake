# OpenStake

OpenStake is a server-authoritative, single-table blackjack room with the visual language of a private casino. It uses virtual credits only: there are no deposits, withdrawals, real-money wagers or prizes.

## The table

- Six-deck blackjack with a 3:2 natural payout
- Dealer stands on soft 17
- Hit, stand, double, split and insurance
- Up to four hands after splitting
- Server-side settlement with a ledger-backed wallet
- Live at-the-table feed, leaderboard and session history

The client sends intents and renders public state. It never generates a card, changes a shoe or mutates a balance.

## Platform

- Automatic temporary guest seats with no signup or password
- $100 starting balance and a $100 faucet refill every 30 minutes while below target
- Ledger wallet with idempotent hands, transactional row locks and refunds
- Provably fair seed pairs with SHA-256 commitments, HMAC-SHA256 card draws and seed reveal
- Per-hand verification data, recent bets and previous seed pairs
- Leaderboard by net profit, biggest win and total wagered
- Demo liquidity bots for the live feed and leaderboard depth, configurable by environment
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
    casino/            shell, lobby, live feed and table preview
    games/blackjack/   table, seat panel, rules and session log
    ui/                Radix-based primitives and design-system components
  modules/
    games/             catalog, cards, blackjack engine and contracts
    betting/           hand orchestration and wallet settlement
    wallet/            ledger, faucet and money primitives
    fairness/          seed pair lifecycle
    identity/          temporary seats and demo personas
    leaderboard/       ranking and transaction history
    realtime/          event bus and demo liquidity
  platform/
    auth/              signed guest sessions
    db/                Drizzle schema, migrations and PGlite client
    container.ts       dependency-injection composition root
  lib/                 money, ids, errors and fairness utilities
```

### Patterns

- **Strategy**: the blackjack engine implements the `ProgressionEngine` contract, so the shared betting flow orchestrates start, action and settlement without game-specific branches.
- **Dependency injection**: `platform/container.ts` wires services; the engine receives a `RandomSource`, wallets use a `Clock` and `IdGenerator`, and tests inject scripted shoes.
- **Repository and unit of work**: every wallet mutation runs through Drizzle transactions with `FOR UPDATE` locks and ledger entries.
- **State machine**: blackjack exposes explicit legal actions, phases and settlement snapshots.
- **Observer**: the realtime event bus drives the SSE live feed without coupling the engine to HTTP.
- **Design system**: Radix primitives and CVA variants keep interaction and appearance consistent across the shell, table and account pages.

## Fairness

Each guest receives a server seed, its SHA-256 hash and an editable client seed. Every hand stores the seed pair, client seed snapshot, nonce and game input. The shoe is shuffled with HMAC-SHA256 floats:

```text
HMAC-SHA256(serverSeed, clientSeed:nonce:cursor)
```

Rotating a seed pair reveals the previous server seed on the fairness page. The same page lists recent hands and returns the full verification payload once the seed is revealed.

## Demo liquidity

Set `DEMO_LIQUIDITY=false` to disable simulated players in the live feed and leaderboard. Demo personas are flagged internally as bots and never touch guest wallets.

## Database note

PGlite keeps the project self-contained and runs the PostgreSQL dialect locally. The schema and migrations are portable to PostgreSQL. For multi-instance production, move to PostgreSQL and a shared pub/sub layer for the realtime gateway.

## Scope

Sportsbook, live-dealer video, additional originals, slots, roulette, baccarat, crash and third-party licensed content are intentionally out of scope. This is a play-money product and a full-stack engineering showcase.
