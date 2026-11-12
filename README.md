<div align="center">

# OpenStake

**A server-authoritative, play-money originals floor with the visual language of a private casino.**

[![Next.js](https://img.shields.io/badge/Next.js-16.4-000000?logo=nextdotjs&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19.3-149eca?logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Drizzle](https://img.shields.io/badge/Drizzle-ORM-c5f74f?logo=drizzle&logoColor=black)](https://orm.drizzle.team)
[![PGlite](https://img.shields.io/badge/PGlite-Postgres%20in%20WASM-4b2e83)](https://pglite.dev)
[![Vitest](https://img.shields.io/badge/tests-vitest%205-6da544?logo=vitest&logoColor=white)](https://vitest.dev)

<img src="docs/screenshots/lobby.png" alt="OpenStake lobby" width="100%" />

</div>

OpenStake is a full-stack reference implementation of a crypto-casino style **originals floor**: eleven
provably-drawn games sharing one wallet, one seed system and one design language. Every bet settles
server-side inside a database transaction, every outcome comes from an HMAC stream, and the client never
sees or generates a result.

There are **no deposits, no withdrawals, no real-money wagers and no prizes**. Balances are virtual
credits, seats are passwordless guests that live in a signed cookie, and the whole database is a single
PGlite directory that boots with `npm run dev`.

---

## Screenshots

<table>
  <tr>
    <td width="50%"><img src="docs/screenshots/dice.png" alt="Dice" /><br/><sub><b>Dice</b> — pick a side and a win chance; the payout scales as <code>99 / chance</code>.</sub></td>
    <td width="50%"><img src="docs/screenshots/mines.png" alt="Mines" /><br/><sub><b>Mines</b> — reveal gems, the multiplier compounds per safe tile, cash out before the board turns.</sub></td>
  </tr>
  <tr>
    <td width="50%"><img src="docs/screenshots/blackjack.png" alt="Blackjack" /><br/><sub><b>Blackjack</b> — four boxes, six decks, S17, 3:2 naturals, doubles, splits and insurance.</sub></td>
    <td width="50%"><img src="docs/screenshots/wallet.png" alt="Wallet" /><br/><sub><b>Wallet</b> — one ledger, one row per movement: wagers, returns, refunds and top-ups.</sub></td>
  </tr>
  <tr>
    <td colspan="2"><img src="docs/screenshots/leaderboard.png" alt="Leaderboard" /><br/><sub><b>Leaderboard</b> — ranked by net profit from settled rounds only, with the floor's live feed beside it.</sub></td>
  </tr>
</table>

---

## The floor

Eleven originals share one wallet, one seed pair per player and one settlement path. Instant games settle in
a single request; table and progression games run an explicit state machine that accepts only the legal
actions it publishes.

| Game | Type | Structure | RTP* |
| --- | --- | --- | --- |
| **Blackjack** | progression | 6 decks · S17 · 3:2 · double · split · insurance | ~99.5% |
| **Dice** | instant | roll under/over, 2–95% win chance | 99.0% |
| **Mines** | progression | 25 tiles, 1–24 mines, `0.99 × C(25,k)/C(25−m,k)` | 99.0% |
| **Limbo** | progression | crash at `0.99 / (1 − r)`, cash out before it flies | 99.0% |
| **Keno** | instant | 40 numbers, 10 drawn, 1–10 picks, 3 risk levels | 99.0% |
| **HiLo** | progression | higher/lower on a live shoe, priced from the cards left | 99.0% |
| **Dragon Tower** | progression | nine floors of eggs and dragons | 99.0% |
| **Chicken Cross** | progression | twelve lanes, each safe step compounds | 99.0% |
| **Plinko** | instant | 8–16 rows, 3 risk levels, 15 paytables | 98.9–99.1% |
| **Wheel** | instant | 10–50 segments, 3 risk levels | 98.4–98.9% |
| **Roulette** | instant | single-zero European wheel, full felt | 97.3% |

<sub>*RTP computed from the shipped paytables with exact binomial / hypergeometric maths, not from marketing copy. The wheel sits below 99% because its multipliers are floored to two decimals after normalisation.</sub>

---

## Architecture

A thin browser that only sends intents and renders public state; one Next.js process that validates and
orchestrates; pure game engines behind a `RandomSource` seam; a single-writer, Postgres-compatible database
underneath.

<img src="docs/screenshots/architecture.png" alt="OpenStake architecture" width="100%" />

### One bet, end to end

```mermaid
sequenceDiagram
    autonumber
    participant UI as Browser (React)
    participant API as Route handler
    participant BET as BettingService
    participant ENG as Game engine
    participant LED as LedgerService
    participant DB as Drizzle / PGlite

    UI->>API: POST /api/games/dice/play (amountCents, input, idempotencyKey)
    API->>API: zod parse input, resolve session user
    API->>BET: playInstant(userId, game, amount, input, key)
    BET->>DB: BEGIN
    BET->>BET: consume seed (SELECT FOR UPDATE, nonce++)
    BET->>ENG: play(input, FairRandom)
    ENG-->>BET: multiplier + public result
    BET->>LED: move(stake) + move(payout)
    LED->>DB: wallet UPDATE + ledger INSERT
    BET->>DB: INSERT bet (seeds, nonce, result)
    BET->>DB: COMMIT
    BET-->>API: public bet + balance
    API-->>UI: 200 (bet, balanceCents, seed)
    Note over BET,UI: the realtime bus publishes the settled bet to /api/stream
```

### Progression games: the server owns the state machine

```mermaid
stateDiagram-v2
    [*] --> player: start (stake locked)
    player --> player: legal action only (hit, reveal, climb, cross, call)
    player --> settled: cash out
    player --> settled: bust, mine, crash, dragon, traffic
    settled --> [*]: payout written to the ledger
    note right of player
        The API returns availableActions for the
        active hand only; anything else is rejected
        with GAME_STATE, so a stale or forged client
        cannot advance a round.
    end note
```

### Data model

```mermaid
erDiagram
    users ||--|| wallets : owns
    users ||--|| player_stats : accumulates
    users ||--o{ bets : places
    users ||--o{ ledger_entries : moves
    users ||--o{ seed_pairs : holds
    users ||--o{ faucet_claims : claims

    users {
        text id PK
        text name UK
        text avatar_preset
        timestamptz onboarded_at
        timestamptz last_seen_at
    }
    wallets {
        text user_id PK
        bigint balance_cents
        int version
    }
    bets {
        text id PK
        text user_id FK
        text game_id
        bigint amount_cents
        bigint payout_cents
        text status
        text idempotency_key UK
        text seed_pair_id FK
        int nonce
        jsonb game_input
        jsonb result
    }
    ledger_entries {
        text id PK
        text user_id FK
        text type
        bigint amount_cents
        bigint balance_after_cents
        text bet_id
    }
    seed_pairs {
        text id PK
        text user_id FK
        text server_seed_encrypted
        text server_seed_hash
        text client_seed
        int nonce
        bool active
    }
    player_stats {
        text user_id PK
        int total_bets
        bigint wagered_cents
        bigint net_profit_cents
    }
    faucet_claims {
        text id PK
        text user_id FK
        bigint amount_cents
        timestamptz claimed_at
    }
```

### Patterns

- **Strategy** — every instant game implements `InstantGameDefinition`, every table game implements
  `ProgressionEngine`; the betting service orchestrates both without game-specific branches.
- **Dependency injection** — `platform/container.ts` wires services; engines receive a `RandomSource`,
  wallets a `Clock` and an `IdGenerator`, so tests inject scripted decks and boards.
- **Repository + unit of work** — every wallet mutation runs in a Drizzle transaction with `FOR UPDATE`
  locks; a balance can only change through a ledger row.
- **State machine** — progression games expose explicit legal actions, phase data and settlement snapshots.
- **Observer** — the realtime event bus drives the SSE live feed without coupling engines to HTTP.
- **Design system** — Radix primitives and CVA variants keep the shell, tables and account pages coherent.

---

## Fairness

Each seat gets a server seed, its SHA-256 commitment and a client seed. A bet stores the seed pair, a
client-seed snapshot and the nonce it consumed, so a round can be replayed byte for byte:

```text
outcome stream = HMAC-SHA256(serverSeed, `${clientSeed}:${nonce}:${cursor}`)
```

- The server seed is 32 random bytes, encrypted at rest with AES-256-GCM, and never returned by the API.
- Only the hash is public while the pair is active — that commitment is what would make a later reveal
  checkable.
- The nonce is consumed in the same transaction that locks the seed row, so two concurrent bets can never
  share a random stream.
- Each digest yields eight `uint32` floats, and every engine draws only through `FairRandom`: there is no
  `Math.random()` anywhere in game logic.

**What is not there yet:** the reveal. `SeedService` exposes `rotate()` and `setClientSeed()`, but no route
or page wires them up, so a player cannot currently pull the old server seed and verify a past round in the
browser. Until that lands, the fairness is architectural rather than demonstrable. A `/fairness` page with
seed rotation, a client-seed field and a round-by-round verifier is the single most valuable next step for
this repo.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 App Router, React 19, TypeScript |
| Styling | Tailwind CSS 4 with a token-driven design system, Radix UI, CVA |
| Motion | Motion and Lucide icons |
| Data | Drizzle ORM + PGlite (Postgres dialect, zero setup), SQL migrations |
| State | TanStack Query, server components for first paint |
| Realtime | in-process event bus fanned out over SSE |
| Validation | zod schemas per game input and per action |
| Tests | Vitest (engine rules, paytables, blackjack settlement) |

---

## Getting started

```bash
npm install
cp .env.example .env.local
npm run dev
```

Generate the two secrets `.env.local` needs:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"  # SESSION_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"     # SEED_ENCRYPTION_KEY
```

Open <http://localhost:3000>. The database is created in `.data/pglite` and migrations are applied on first
access — no Postgres, no Docker, no seed script.

| Command | What it does |
| --- | --- |
| `npm run dev` | dev server on :3000 |
| `npm run build` / `npm run start` | production build and server |
| `npm run lint` | eslint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest suite |
| `npm run db:generate` / `npm run db:migrate` | Drizzle migrations |

### Deploying it

The app is one Node process with a single-writer database, so the deploy is a unit file plus a tunnel:

```ini
[Service]
WorkingDirectory=/path/to/OpenStake
Environment=NODE_ENV=production
ExecStart=/usr/bin/node node_modules/next/dist/bin/next start -H 127.0.0.1 -p 3100
Restart=always
```

Point `cloudflared tunnel --url http://localhost:3100` at it, or put nginx in front for a stable hostname.
Beyond one instance, move PGlite to PostgreSQL and the realtime bus to a shared pub/sub — the schema and the
engines do not change.

---

## Project layout

```text
src/
  app/                     routes, route handlers, SSE stream
  components/
    casino/                shell, lobby, game tiles, live feed
    games/                 11 game UIs plus shared shell, controls, history
    ui/                    Radix-based design system primitives
    onboarding/            first-visit seat dialog
    avatars/               avatar picker with presets and photo upload
  modules/
    betting/               bet orchestration and settlement
    games/                 catalog, instant engines, progression engines, paytables
    wallet/                ledger, faucet and money primitives
    fairness/              seed pair lifecycle
    identity/              guest seats, profiles and avatar presets
    leaderboard/           ranking and transaction history
    realtime/              event bus and live bet feed
  platform/
    auth/                  signed guest sessions
    db/                    Drizzle schema, migrations, PGlite client
    container.ts           dependency-injection composition root
  lib/                     money, ids, errors, fairness primitives
docs/
  architecture.html        source of the architecture diagram
  screenshots/             README images
```

---

## Scope

Sportsbook, live-dealer video, third-party licensed content, payments and real-money wagering are
intentionally out of scope. This is a play-money product and a full-stack engineering showcase: the parts
worth reading are the settlement path, the seed lifecycle, the progression state machines and the paytable
maths.
