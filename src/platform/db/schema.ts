import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    isBot: boolean("is_bot").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [uniqueIndex("users_name_unique").on(table.name)],
);

export const wallets = pgTable("wallets", {
  userId: text("user_id")
    .primaryKey()
    .references(() => users.id, { onDelete: "cascade" }),
  balanceCents: bigint("balance_cents", { mode: "number" }).notNull().default(0),
  version: integer("version").notNull().default(0),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const ledgerEntries = pgTable(
  "ledger_entries",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    balanceAfterCents: bigint("balance_after_cents", { mode: "number" }).notNull(),
    betId: text("bet_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("ledger_user_created_idx").on(table.userId, table.createdAt),
    index("ledger_bet_idx").on(table.betId),
  ],
);

export const seedPairs = pgTable(
  "seed_pairs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    serverSeedEncrypted: text("server_seed_encrypted").notNull(),
    serverSeedHash: text("server_seed_hash").notNull(),
    clientSeed: text("client_seed").notNull(),
    nonce: integer("nonce").notNull().default(0),
    active: boolean("active").notNull().default(true),
    revealedServerSeed: text("revealed_server_seed"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
  },
  (table) => [
    index("seed_pairs_user_active_idx").on(table.userId, table.active),
    uniqueIndex("seed_pairs_one_active").on(table.userId).where(sql`${table.active} = true`),
  ],
);

export const bets = pgTable(
  "bets",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("game_id").notNull(),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    payoutCents: bigint("payout_cents", { mode: "number" }).notNull().default(0),
    multiplier: doublePrecision("multiplier").notNull().default(0),
    status: text("status").notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    seedPairId: text("seed_pair_id"),
    clientSeedSnapshot: text("client_seed_snapshot"),
    nonce: integer("nonce").notNull().default(0),
    gameInput: jsonb("game_input"),
    result: jsonb("result"),
    secret: jsonb("secret"),
    lastActionKey: text("last_action_key"),
    version: integer("version").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (table) => [
    uniqueIndex("bets_idempotency_unique").on(table.idempotencyKey),
    index("bets_user_created_idx").on(table.userId, table.createdAt),
    index("bets_game_created_idx").on(table.gameId, table.createdAt),
    index("bets_status_idx").on(table.status),
    uniqueIndex("bets_one_active_per_game").on(table.userId, table.gameId).where(sql`${table.status} = 'active'`),
  ],
);

export const faucetClaims = pgTable(
  "faucet_claims",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("faucet_user_created_idx").on(table.userId, table.claimedAt)],
);

export const playerStats = pgTable(
  "player_stats",
  {
    userId: text("user_id")
      .primaryKey()
      .references(() => users.id, { onDelete: "cascade" }),
    totalBets: integer("total_bets").notNull().default(0),
    wageredCents: bigint("wagered_cents", { mode: "number" }).notNull().default(0),
    payoutCents: bigint("payout_cents", { mode: "number" }).notNull().default(0),
    netProfitCents: bigint("net_profit_cents", { mode: "number" }).notNull().default(0),
    biggestWinCents: bigint("biggest_win_cents", { mode: "number" }).notNull().default(0),
    biggestMultiplier: doublePrecision("biggest_multiplier").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export const gameStates = pgTable(
  "game_states",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    gameId: text("game_id").notNull(),
    state: jsonb("state").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.userId, table.gameId] })],
);

export const crashRounds = pgTable("crash_rounds", {
  id: text("id").primaryKey(),
  roundNumber: integer("round_number").notNull(),
  serverSeed: text("server_seed").notNull(),
  serverSeedHash: text("server_seed_hash").notNull(),
  crashPoint: doublePrecision("crash_point").notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
});

export const crashBets = pgTable(
  "crash_bets",
  {
    id: text("id").primaryKey(),
    roundId: text("round_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amountCents: bigint("amount_cents", { mode: "number" }).notNull(),
    autoCashout: doublePrecision("auto_cashout"),
    cashoutMultiplier: doublePrecision("cashout_multiplier"),
    payoutCents: bigint("payout_cents", { mode: "number" }).notNull().default(0),
    status: text("status").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    settledAt: timestamp("settled_at", { withTimezone: true }),
  },
  (table) => [
    index("crash_bets_round_idx").on(table.roundId),
    index("crash_bets_user_idx").on(table.userId, table.createdAt),
    uniqueIndex("crash_bets_one_per_round").on(table.userId, table.roundId).where(sql`${table.status} = 'active'`),
  ],
);
