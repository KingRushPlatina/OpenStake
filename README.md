# OpenStake

OpenStake is a server-authoritative social casino built with Next.js. It recreates the density, rhythm and visual language of a modern crypto casino while using only virtual credits. There are no deposits, withdrawals, real-money wagers or prizes.

## Games

| Family | Games |
| --- | --- |
| Originals | Dice, Limbo, Plinko, Mines, Keno, Wheel, HiLo, Dragon Tower, Chicken Cross |
| Table | Blackjack, Roulette, Baccarat, Video Poker |
| Realtime | Crash |
| Slots | Neon Fruits, Golden Relic |

Every game is settled on the server. The client sends intents and renders public state; it never generates an outcome or mutates a balance.

## Core features

- Automatic temporary guest accounts, no sign-up or password
- $100 starting balance and a $100 faucet refill every 30 minutes while below target
- Ledger-backed wallet with idempotent bets and transactional row locks
- Provably fair seed pairs with SHA-256 commitments, HMAC-SHA256 randomness and seed reveal
- Live bets feed, shared Crash rounds and leaderboard via SSE
- Leaderboards by net profit, biggest win and total wagered
- Demo liquidity bots for live feeds, Crash lobbies and leaderboard depth, configurable by env
- Full-stack type safety with TypeScript, Zod and Drizzle
- Responsive dark UI with original OpenStake branding and assets
- No source comments: naming, types, tests and structure carry the intent

## Stack

- Next.js 16 App Router, React 19, TypeScript
- Tailwind CSS 4, Motion, Lucide
- TanStack Query
- PostgreSQL-compatible PGlite for a zero-setup local database
- Drizzle ORM and SQL migrations
- Vitest for engine and probability tests

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

Open `http://localhost:3000`. The PGlite database is created automatically in `.data/pglite` and migrations are applied on first access.

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
  components/          UI, game stages, casino shell
  modules/
    games/             pure engines, paytables, catalog and game contracts
    betting/           bet orchestration and wallet settlement
    wallet/            ledger, faucet and money primitives
    fairness/          seed pair lifecycle
    identity/          temporary accounts and demo personas
    leaderboard/       ranking and transaction history
    crash/             authoritative shared crash engine
    realtime/          event bus and demo liquidity
  platform/
    auth/              signed guest sessions
    db/                Drizzle schema, migrations and PGlite client
    container.ts       dependency-injection composition root
  lib/                 money, ids, errors and fairness utilities
```

### Patterns

- **Factory**: `GameRegistry`-style maps in `modules/games` build instant and progression game definitions from a single catalog.
- **Strategy**: every stateful game implements the `ProgressionEngine` contract; shared betting flows orchestrate them without game-specific branches.
- **Dependency injection**: `platform/container.ts` wires services; engines receive a `RandomSource`, wallets use a `Clock` and `IdGenerator`, and tests inject deterministic implementations.
- **Repository/unit of work**: all wallet mutations run through Drizzle transactions with `FOR UPDATE` locks and ledger entries.
- **State machines**: Blackjack, Mines, Crash and the other stateful games expose explicit legal actions and settle atomically.
- **Observer**: the realtime event bus drives the SSE live-bets and Crash streams without coupling engines to HTTP.

### Adding a game

1. Add metadata to `src/modules/games/catalog.ts`.
2. Implement an instant definition or a `ProgressionEngine` in its own module.
3. Register it in the relevant game index.
4. Add the UI stage and map it in `src/components/games/game-router.tsx`.
5. Add probability or rule tests.

## Fairness

Each guest receives a server seed, its SHA-256 hash and an editable client seed. Every bet stores the seed pair, client seed snapshot, nonce and game input. Outcomes come from HMAC-SHA256 floats:

```text
HMAC-SHA256(serverSeed, clientSeed:nonce:cursor)
```

Rotating a seed pair reveals the previous server seed on the fairness page. The fairness page can also display the verification data for recent bets. Crash uses a per-round committed server seed, revealed after the round.

## Demo liquidity

Set `DEMO_LIQUIDITY=false` to disable simulated players in the live feed, Crash lobby and leaderboard. Demo personas never touch real guest wallets and are flagged internally as bots.

## Database note

PGlite keeps the project self-contained and runs the PostgreSQL dialect locally. The schema and migrations are portable to PostgreSQL. For multi-instance production, move to PostgreSQL and a shared pub/sub layer for the realtime gateway.

## Scope

Sportsbook, live-dealer video, licensed third-party slots, real payments, KYC, chat, tips and admin tooling are intentionally out of scope. This project is a play-money product and a full-stack engineering showcase.
