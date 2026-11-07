import { and, desc, eq } from "drizzle-orm";
import { getDatabase } from "@/platform/db/client";
import { seedPairs } from "@/platform/db/schema";
import { decryptSecret, encryptSecret, randomHex, sha256 } from "@/lib/fairness";
import { AppError } from "@/lib/errors";
import type { IdGenerator } from "@/modules/wallet/constants";

export class SeedService {
  constructor(private readonly ids: IdGenerator) {}

  async createForUser(userId: string) {
    const database = await getDatabase();
    return this.createWithDatabase(database, userId);
  }

  async createWithDatabase(database: Awaited<ReturnType<typeof getDatabase>>, userId: string) {
    const serverSeed = randomHex(32);
    const row = {
      id: this.ids.create("seed"),
      userId,
      serverSeedEncrypted: encryptSecret(serverSeed),
      serverSeedHash: sha256(serverSeed),
      clientSeed: randomHex(8),
      nonce: 0,
      active: true,
    };
    await database.insert(seedPairs).values(row);
    return row;
  }

  async getActive(userId: string) {
    const database = await getDatabase();
    const [row] = await database
      .select()
      .from(seedPairs)
      .where(and(eq(seedPairs.userId, userId), eq(seedPairs.active, true)))
      .limit(1);
    return row ?? null;
  }

  async rotate(userId: string) {
    const database = await getDatabase();
    return database.transaction(async (transaction) => {
      const [active] = await transaction
        .select()
        .from(seedPairs)
        .where(and(eq(seedPairs.userId, userId), eq(seedPairs.active, true)))
        .for("update")
        .limit(1);
      if (!active) throw new AppError("NOT_FOUND", "No active seed pair", 404);
      const revealedServerSeed = decryptSecret(active.serverSeedEncrypted);
      await transaction
        .update(seedPairs)
        .set({
          active: false,
          revealedServerSeed,
          rotatedAt: new Date(),
        })
        .where(eq(seedPairs.id, active.id));
      const next = await this.createWithDatabase(transaction as unknown as Awaited<ReturnType<typeof getDatabase>>, userId);
      return {
        previous: {
          id: active.id,
          serverSeedHash: active.serverSeedHash,
          serverSeed: revealedServerSeed,
          clientSeed: active.clientSeed,
          nonce: active.nonce,
        },
        active: {
          id: next.id,
          serverSeedHash: next.serverSeedHash,
          clientSeed: next.clientSeed,
          nonce: next.nonce,
        },
      };
    });
  }

  async setClientSeed(userId: string, clientSeed: string) {
    const database = await getDatabase();
    const [active] = await database
      .select()
      .from(seedPairs)
      .where(and(eq(seedPairs.userId, userId), eq(seedPairs.active, true)))
      .limit(1);
    if (!active) throw new AppError("NOT_FOUND", "No active seed pair", 404);
    await database.update(seedPairs).set({ clientSeed }).where(eq(seedPairs.id, active.id));
    return { ...active, clientSeed };
  }

  async getOverview(userId: string) {
    const database = await getDatabase();
    const rows = await database
      .select()
      .from(seedPairs)
      .where(eq(seedPairs.userId, userId))
      .orderBy(desc(seedPairs.createdAt))
      .limit(12);
    const active = rows.find((row) => row.active);
    return {
      active: active
        ? {
            id: active.id,
            serverSeedHash: active.serverSeedHash,
            clientSeed: active.clientSeed,
            nonce: active.nonce,
            createdAt: active.createdAt,
          }
        : null,
      history: rows
        .filter((row) => !row.active)
        .map((row) => ({
          id: row.id,
          serverSeedHash: row.serverSeedHash,
          serverSeed: row.revealedServerSeed,
          clientSeed: row.clientSeed,
          nonce: row.nonce,
          rotatedAt: row.rotatedAt,
        })),
    };
  }
}
