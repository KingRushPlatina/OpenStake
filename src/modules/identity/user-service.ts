import { eq, sql } from "drizzle-orm";
import { randomInt } from "node:crypto";
import { getDatabase } from "@/platform/db/client";
import { ledgerEntries, playerStats, users, wallets } from "@/platform/db/schema";
import { AppError } from "@/lib/errors";
import type { Clock, IdGenerator } from "@/modules/wallet/constants";
import { FAUCET_TARGET_CENTS, STARTING_BALANCE_CENTS } from "@/modules/wallet/constants";
import type { SeedService } from "@/modules/fairness/seed-service";
import { defaultAvatarPreset, isAvatarPreset } from "./avatars";

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
        avatarPreset: users.avatarPreset,
        hasAvatarImage: sql<boolean>`${users.avatarImage} is not null`,
        onboardedAt: users.onboardedAt,
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
      user: {
        id: row.id,
        name: row.name,
        avatarPreset: row.avatarPreset,
        avatarUrl: row.hasAvatarImage ? `/api/avatars/${row.id}` : null,
        onboarded: row.onboardedAt !== null,
        createdAt: row.createdAt,
      },
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

  async completeOnboarding(
    userId: string,
    input: { name: unknown; avatarPreset?: unknown; avatarImage?: unknown },
  ) {
    const name = this.validName(input.name);
    await this.assertNameAvailable(userId, name);
    const avatar = this.validAvatar(input.avatarPreset, input.avatarImage);
    await (await getDatabase())
      .update(users)
      .set({
        name,
        avatarPreset: avatar.avatarPreset ?? defaultAvatarPreset,
        avatarImage: avatar.avatarImage,
        onboardedAt: this.clock.now(),
      })
      .where(eq(users.id, userId));
    return this.getSession(userId);
  }

  async updateProfile(
    userId: string,
    input: { name?: unknown; avatarPreset?: unknown; avatarImage?: unknown },
  ) {
    const patch: { name?: string; avatarPreset?: string | null; avatarImage?: string | null } = {};
    if (input.name !== undefined) {
      patch.name = this.validName(input.name);
      await this.assertNameAvailable(userId, patch.name);
    }
    const hasAvatarUpdate = input.avatarPreset !== undefined || input.avatarImage !== undefined;
    if (hasAvatarUpdate) {
      const avatar = this.validAvatar(input.avatarPreset, input.avatarImage);
      patch.avatarPreset = avatar.avatarImage ? null : avatar.avatarPreset ?? defaultAvatarPreset;
      patch.avatarImage = avatar.avatarImage;
    }
    if (Object.keys(patch).length === 0) {
      throw new AppError("INVALID_INPUT", "Nothing to update", 400);
    }
    await (await getDatabase()).update(users).set(patch).where(eq(users.id, userId));
    return this.getSession(userId);
  }

  private async assertNameAvailable(userId: string, name: string) {
    const database = await getDatabase();
    const [existing] = await database.select({ id: users.id }).from(users).where(eq(users.name, name)).limit(1);
    if (existing && existing.id !== userId) {
      throw new AppError("CONFLICT", "That name is already taken", 409);
    }
  }

  private validName(value: unknown) {
    const clean = String(value ?? "").trim();
    if (!/^[a-zA-Z0-9_]{3,16}$/.test(clean)) {
      throw new AppError("INVALID_INPUT", "Use 3-16 letters, numbers or underscores", 400);
    }
    return clean;
  }

  private validAvatar(presetValue: unknown, imageValue: unknown) {
    const image = typeof imageValue === "string" ? imageValue.trim() : "";
    if (image) {
      if (!/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image) || image.length > 400_000) {
        throw new AppError("INVALID_INPUT", "Use a PNG, JPEG or WebP image under 300 KB", 400);
      }
      return { avatarPreset: null, avatarImage: image };
    }
    const preset = presetValue === undefined || presetValue === null ? null : String(presetValue);
    if (preset && !isAvatarPreset(preset)) {
      throw new AppError("INVALID_INPUT", "Unknown avatar", 400);
    }
    return { avatarPreset: preset, avatarImage: null };
  }
}
