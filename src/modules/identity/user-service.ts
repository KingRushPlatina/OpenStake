import { eq, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { getDatabase } from "@/platform/db/client";
import { env } from "@/platform/env";
import { ledgerEntries, playerStats, users, wallets } from "@/platform/db/schema";
import { AppError } from "@/lib/errors";
import type { Clock, IdGenerator } from "@/modules/wallet/constants";
import { FAUCET_TARGET_CENTS, STARTING_BALANCE_CENTS } from "@/modules/wallet/constants";
import type { SeedService } from "@/modules/fairness/seed-service";

const ADJECTIVES = [
  "Silent",
  "Lucky",
  "Neon",
  "Golden",
  "Midnight",
  "Crimson",
  "Electric",
  "Frost",
  "Royal",
  "Wild",
  "Cosmic",
  "Hidden",
  "Swift",
  "Burning",
  "Velvet",
  "Arctic",
];

const NOUNS = [
  "Falcon",
  "Wolf",
  "Comet",
  "Tiger",
  "Phantom",
  "Dragon",
  "Rider",
  "Fox",
  "Storm",
  "Viper",
  "Ace",
  "Nomad",
  "Hawk",
  "Panther",
  "Orbit",
  "Ghost",
  "King",
  "Raven",
  "Echo",
  "Cobra",
];

function generatedName() {
  const adjective = ADJECTIVES[randomInt(ADJECTIVES.length)];
  const noun = NOUNS[randomInt(NOUNS.length)];
  return `${adjective}${noun}${randomInt(10, 100)}`;
}

function botName(index: number) {
  const adjective = ADJECTIVES[index % ADJECTIVES.length];
  const noun = NOUNS[(index * 7 + 3) % NOUNS.length];
  return `${adjective}${noun}`;
}

function botStats(index: number) {
  const totalBets = 120 + ((index * 37) % 1_900);
  const averageBet = 100 + ((index * 211) % 4_900);
  const wagered = totalBets * averageBet;
  const edge = (((index * 13) % 9) - 4) / 100;
  const profit = Math.round(wagered * edge);
  const biggestWin = 25_000 + ((index * 44_221) % 480_000);
  return {
    totalBets,
    wageredCents: wagered,
    payoutCents: wagered + profit,
    netProfitCents: profit,
    biggestWinCents: biggestWin,
    biggestMultiplier: Math.round((2 + ((index * 211) % 4_800) / 100) * 100) / 100,
  };
}

export class UserService {
  constructor(
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly seeds: SeedService,
  ) {}

  async createGuest() {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const userId = this.ids.create("usr");
      const name = generatedName();
      try {
        await (await getDatabase()).transaction(async (transaction) => {
          const database = transaction as unknown as Awaited<ReturnType<typeof getDatabase>>;
          await database.insert(users).values({ id: userId, name, lastSeenAt: this.clock.now() });
          await database.insert(wallets).values({ userId, balanceCents: STARTING_BALANCE_CENTS });
          await database.insert(playerStats).values({ userId });
          await database.insert(ledgerEntries).values({
            id: this.ids.create("led"),
            userId,
            type: "welcome",
            amountCents: STARTING_BALANCE_CENTS,
            balanceAfterCents: STARTING_BALANCE_CENTS,
            metadata: { source: "guest-account" },
            createdAt: this.clock.now(),
          });
          await this.seeds.createWithDatabase(database, userId);
        });
        return this.getSession(userId);
      } catch (error) {
        if (attempt === 4) throw error;
      }
    }
    throw new AppError("CONFLICT", "Could not create a guest account", 500);
  }

  async getById(userId: string) {
    const database = await getDatabase();
    const [user] = await database.select().from(users).where(eq(users.id, userId)).limit(1);
    return user ?? null;
  }

  async getSession(userId: string) {
    const database = await getDatabase();
    const [row] = await database
      .select({
        id: users.id,
        name: users.name,
        createdAt: users.createdAt,
        balanceCents: wallets.balanceCents,
        totalBets: playerStats.totalBets,
        wageredCents: playerStats.wageredCents,
        payoutCents: playerStats.payoutCents,
        netProfitCents: playerStats.netProfitCents,
        biggestWinCents: playerStats.biggestWinCents,
        biggestMultiplier: playerStats.biggestMultiplier,
      })
      .from(users)
      .innerJoin(wallets, eq(wallets.userId, users.id))
      .innerJoin(playerStats, eq(playerStats.userId, users.id))
      .where(eq(users.id, userId))
      .limit(1);
    if (!row) throw new AppError("UNAUTHORIZED", "Guest account not found", 401);
    await database.update(users).set({ lastSeenAt: this.clock.now() }).where(eq(users.id, userId));
    const activeSeed = await this.seeds.getActive(userId);
    const belowTarget = row.balanceCents < FAUCET_TARGET_CENTS;
    return {
      user: { id: row.id, name: row.name, createdAt: row.createdAt },
      wallet: { balanceCents: row.balanceCents },
      stats: {
        totalBets: row.totalBets,
        wageredCents: row.wageredCents,
        payoutCents: row.payoutCents,
        netProfitCents: row.netProfitCents,
        biggestWinCents: row.biggestWinCents,
        biggestMultiplier: row.biggestMultiplier,
      },
      faucet: {
        available: belowTarget,
        amountCents: Math.max(0, FAUCET_TARGET_CENTS - row.balanceCents),
        targetCents: FAUCET_TARGET_CENTS,
      },
      seed: activeSeed
        ? {
            serverSeedHash: activeSeed.serverSeedHash,
            clientSeed: activeSeed.clientSeed,
            nonce: activeSeed.nonce,
          }
        : null,
    };
  }

  async rename(userId: string, name: string) {
    const clean = name.trim();
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(clean)) {
      throw new AppError("INVALID_INPUT", "Use 3-16 letters, numbers or underscores", 400);
    }
    const database = await getDatabase();
    const [existing] = await database.select().from(users).where(eq(users.name, clean)).limit(1);
    if (existing && existing.id !== userId) {
      throw new AppError("CONFLICT", "That name is already taken", 409);
    }
    await database.update(users).set({ name: clean }).where(eq(users.id, userId));
    return this.getSession(userId);
  }

  async ensureDemoBots() {
    if (!env.DEMO_LIQUIDITY) return;
    const database = await getDatabase();
    const [existing] = await database
      .select({ count: sql<number>`count(*)::int` })
      .from(users)
      .where(eq(users.isBot, true));
    if ((existing?.count ?? 0) >= 40) return;
    const count = 48;
    for (let index = 0; index < count; index += 1) {
      const userId = `bot_${String(index + 1).padStart(2, "0")}`;
      const name = botName(index);
      const stats = botStats(index);
      await database
        .insert(users)
        .values({ id: userId, name, isBot: true, lastSeenAt: this.clock.now() })
        .onConflictDoNothing();
      await database
        .insert(wallets)
        .values({ userId, balanceCents: STARTING_BALANCE_CENTS + stats.netProfitCents })
        .onConflictDoNothing();
      await database.insert(playerStats).values({ userId, ...stats }).onConflictDoNothing();
    }
  }

  async listBots() {
    const database = await getDatabase();
    return database
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.isBot, true))
      .orderBy(users.id);
  }
}
