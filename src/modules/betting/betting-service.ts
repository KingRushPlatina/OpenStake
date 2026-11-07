import { and, desc, eq } from "drizzle-orm";
import { getDatabase, type Database } from "@/platform/db/client";
import { bets, seedPairs, users, wallets } from "@/platform/db/schema";
import { decryptSecret, FairRandom } from "@/lib/fairness";
import { instantGameById } from "@/modules/games/instant";
import { AppError } from "@/lib/errors";
import { progressionGameById } from "@/modules/games/stateful";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import type { ProgressionSnapshot } from "@/modules/games/stateful/types";
import type { Clock, IdGenerator } from "@/modules/wallet/constants";
import { LedgerService } from "@/modules/wallet/ledger-service";
import { getEventBus, type LiveBetEvent } from "@/modules/realtime/event-bus";
import type { SeedService } from "@/modules/fairness/seed-service";

type BetRow = typeof bets.$inferSelect;

type SeedContext = {
  id: string;
  hash: string;
  clientSeed: string;
  nonce: number;
  random: FairRandom;
};

function validateIdempotencyKey(key: string) {
  if (!/^[a-zA-Z0-9_-]{8,100}$/.test(key)) {
    throw new AppError("INVALID_INPUT", "Invalid request key", 400);
  }
}

function validateAmount(metadata: GameMetadata, amountCents: number) {
  if (!Number.isInteger(amountCents) || amountCents < metadata.minBetCents) {
    throw new AppError("BET_LIMIT", `Minimum bet is ${metadata.minBetCents / 100} USD`, 400);
  }
  if (amountCents > metadata.maxBetCents) {
    throw new AppError("BET_LIMIT", `Maximum bet is ${metadata.maxBetCents / 100} USD`, 400);
  }
}

function cappedMultiplier(metadata: GameMetadata, multiplier: number) {
  if (!Number.isFinite(multiplier) || multiplier < 0) return 0;
  return Math.round(Math.min(multiplier, metadata.maxWinMultiplier) * 10_000) / 10_000;
}

function payoutFor(amountCents: number, multiplier: number) {
  return Math.floor(amountCents * multiplier);
}

function mapBet(row: BetRow, seed: { serverSeedHash: string; clientSeed: string; nonce: number } | null, balanceCents?: number): PublicBet {
  return {
    id: row.id,
    gameId: row.gameId as PublicBet["gameId"],
    amountCents: row.amountCents,
    payoutCents: row.payoutCents,
    profitCents: row.payoutCents - row.amountCents,
    multiplier: row.multiplier,
    status: row.status,
    result: (row.result ?? {}) as Record<string, unknown>,
    createdAt: row.createdAt.toISOString(),
    seed,
    balanceCents,
  };
}

export class BettingService {
  constructor(
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly ledger: LedgerService,
    private readonly seeds: SeedService,
  ) {}

  async playInstant(userId: string, gameId: string, requestedAmount: number, input: unknown, idempotencyKey: string) {
    validateIdempotencyKey(idempotencyKey);
    const game = instantGameById.get(gameId as never);
    if (!game) throw new AppError("GAME_NOT_FOUND", "Game not available", 404);
    const parsedInput = game.inputSchema.parse(input);
    const amountCents = game.resolveAmount ? game.resolveAmount(parsedInput) : requestedAmount;
    validateAmount(game.metadata, amountCents);

    const existing = await this.findByIdempotencyKey(userId, idempotencyKey);
    if (existing) return this.hydrate(existing);

    const database = await getDatabase();
    try {
      const result = await database.transaction(async (transaction) => {
        const tx = transaction as unknown as Database;
        const wallet = await this.ledger.lockWallet(tx, userId);
        if (wallet.balanceCents < amountCents) {
          throw new AppError("INSUFFICIENT_FUNDS", "Your balance is too low for this bet", 400);
        }
        const seed = await this.consumeSeed(tx, userId);
        const outcome = game.play(parsedInput, seed.random);
        const multiplier = cappedMultiplier(game.metadata, outcome.multiplier);
        const payoutCents = payoutFor(amountCents, multiplier);
        const now = this.clock.now();
        const betId = this.ids.create("bet");
        await this.ledger.recordPlacement(tx, userId, amountCents);
        const balanceAfterDebit = await this.ledger.move(tx, {
          userId,
          amountCents: -amountCents,
          type: "bet",
          betId,
          metadata: { gameId },
        });
        if (balanceAfterDebit < 0) throw new AppError("INSUFFICIENT_FUNDS", "Your balance is too low for this bet", 400);
        let balance = balanceAfterDebit;
        if (payoutCents > 0) {
          balance = await this.ledger.move(tx, {
            userId,
            amountCents: payoutCents,
            type: "payout",
            betId,
            metadata: { gameId, multiplier },
          });
          await this.ledger.recordSettlement(tx, userId, payoutCents, multiplier);
        } else {
          await this.ledger.recordSettlement(tx, userId, 0, multiplier);
        }
        const [inserted] = await tx
          .insert(bets)
          .values({
            id: betId,
            userId,
            gameId,
            amountCents,
            payoutCents,
            multiplier,
            status: "settled",
            idempotencyKey,
            seedPairId: seed.id,
            clientSeedSnapshot: seed.clientSeed,
            nonce: seed.nonce,
            gameInput: parsedInput,
            result: outcome.result,
            version: 1,
            createdAt: now,
            settledAt: now,
          })
          .returning();
        const [user] = await tx.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
        return { bet: inserted, balance, userName: user?.name ?? "Player" };
      });

      this.publish(result.bet, result.userName, game.metadata);
      return this.hydrate(result.bet, result.balance);
    } catch (error) {
      const duplicate = await this.findByIdempotencyKey(userId, idempotencyKey);
      if (duplicate) return this.hydrate(duplicate);
      if (error instanceof AppError) throw error;
      throw error;
    }
  }

  async startProgression(userId: string, gameId: string, amountCents: number, input: unknown, idempotencyKey: string) {
    validateIdempotencyKey(idempotencyKey);
    const game = progressionGameById.get(gameId as never);
    if (!game) throw new AppError("GAME_NOT_FOUND", "Game not available", 404);
    validateAmount(game.metadata, amountCents);
    const parsedInput = game.startSchema.parse(input);

    const existing = await this.findByIdempotencyKey(userId, idempotencyKey);
    if (existing) return this.hydrate(existing);

    const database = await getDatabase();
    const [active] = await database
      .select({ id: bets.id })
      .from(bets)
      .where(and(eq(bets.userId, userId), eq(bets.gameId, gameId), eq(bets.status, "active")))
      .limit(1);
    if (active) throw new AppError("GAME_STATE", "Finish your active round before starting another", 400);
    try {
      const result = await database.transaction(async (transaction) => {
        const tx = transaction as unknown as Database;
        const wallet = await this.ledger.lockWallet(tx, userId);
        if (wallet.balanceCents < amountCents) {
          throw new AppError("INSUFFICIENT_FUNDS", "Your balance is too low for this bet", 400);
        }
        const seed = await this.consumeSeed(tx, userId);
        const snapshot = game.start(parsedInput, { betCents: amountCents, random: seed.random });
        const settled = snapshot.status === "settled";
        const multiplier = cappedMultiplier(game.metadata, snapshot.multiplier);
        const payoutCents = settled ? payoutFor(amountCents, multiplier) : 0;
        const now = this.clock.now();
        const betId = this.ids.create("bet");

        await this.ledger.recordPlacement(tx, userId, amountCents);
        let balance = await this.ledger.move(tx, {
          userId,
          amountCents: -amountCents,
          type: "bet",
          betId,
          metadata: { gameId },
        });
        if (settled && payoutCents > 0) {
          balance = await this.ledger.move(tx, {
            userId,
            amountCents: payoutCents,
            type: "payout",
            betId,
            metadata: { gameId, multiplier },
          });
          await this.ledger.recordSettlement(tx, userId, payoutCents, multiplier);
        } else if (settled) {
          await this.ledger.recordSettlement(tx, userId, 0, multiplier);
        }

        const [inserted] = await tx
          .insert(bets)
          .values({
            id: betId,
            userId,
            gameId,
            amountCents,
            payoutCents,
            multiplier,
            status: settled ? "settled" : "active",
            idempotencyKey,
            seedPairId: seed.id,
            clientSeedSnapshot: seed.clientSeed,
            nonce: seed.nonce,
            gameInput: parsedInput,
            result: settled ? snapshot.settledResult : snapshot.publicState,
            secret: settled ? null : snapshot.secret,
            version: 1,
            createdAt: now,
            settledAt: settled ? now : null,
          })
          .returning();
        const [user] = await tx.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
        return { bet: inserted, balance, userName: user?.name ?? "Player" };
      });
      if (result.bet.status === "settled") this.publish(result.bet, result.userName, game.metadata);
      return this.hydrate(result.bet, result.balance);
    } catch (error) {
      const duplicate = await this.findByIdempotencyKey(userId, idempotencyKey);
      if (duplicate) return this.hydrate(duplicate);
      if (error instanceof AppError) throw error;
      throw error;
    }
  }

  async act(userId: string, betId: string, action: unknown, actionKey: string) {
    validateIdempotencyKey(actionKey);
    const gameId = await this.getBetGameId(userId, betId);
    const game = progressionGameById.get(gameId as never);
    if (!game) throw new AppError("GAME_NOT_FOUND", "Game not available", 404);

    const database = await getDatabase();
    const result = await database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      const [row] = await tx
        .select()
        .from(bets)
        .where(and(eq(bets.id, betId), eq(bets.userId, userId)))
        .for("update")
        .limit(1);
      if (!row) throw new AppError("NOT_FOUND", "Bet not found", 404);
      if (row.lastActionKey === actionKey) {
        return { bet: row, balance: await this.getBalance(tx, userId), userName: null, settledNow: false };
      }
      if (row.status !== "active") throw new AppError("GAME_STATE", "This round is already settled", 400);
      const snapshot: ProgressionSnapshot = {
        secret: row.secret,
        publicState: (row.result ?? {}) as Record<string, unknown>,
        multiplier: row.multiplier,
        status: "active",
      };
      let next: ProgressionSnapshot;
      try {
        next = game.act(snapshot, action);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Invalid action";
        throw new AppError("GAME_STATE", message, 400);
      }
      const settled = next.status === "settled";
      const multiplier = settled ? cappedMultiplier(game.metadata, next.multiplier) : next.multiplier;
      const additionalStakeCents = Math.max(0, next.additionalStakeCents ?? 0);
      let totalStakeCents = row.amountCents;
      const now = this.clock.now();
      let balance = await this.getBalance(tx, userId);
      if (additionalStakeCents > 0) {
        const wallet = await this.ledger.lockWallet(tx, userId);
        if (wallet.balanceCents < additionalStakeCents) {
          throw new AppError("INSUFFICIENT_FUNDS", "Your balance is too low for this action", 400);
        }
        totalStakeCents += additionalStakeCents;
        balance = await this.ledger.move(tx, {
          userId,
          amountCents: -additionalStakeCents,
          type: "bet",
          betId,
          metadata: { gameId, additionalStake: true },
        });
        await this.ledger.recordAdditionalStake(tx, userId, additionalStakeCents);
      }
      const payoutCents = settled ? payoutFor(totalStakeCents, multiplier) : 0;
      if (settled) {
        if (payoutCents > 0) {
          balance = await this.ledger.move(tx, {
            userId,
            amountCents: payoutCents,
            type: "payout",
            betId,
            metadata: { gameId, multiplier },
          });
        }
        await this.ledger.recordSettlement(tx, userId, payoutCents, multiplier);
      }
      const [updated] = await tx
        .update(bets)
        .set({
          amountCents: totalStakeCents,
          status: settled ? "settled" : "active",
          payoutCents,
          multiplier,
          result: settled ? next.settledResult : next.publicState,
          secret: settled ? null : next.secret,
          lastActionKey: actionKey,
          version: row.version + 1,
          settledAt: settled ? now : null,
        })
        .where(eq(bets.id, betId))
        .returning();
      const [user] = await tx.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
      return { bet: updated, balance, userName: user?.name ?? "Player", settledNow: settled };
    });

    if (result.settledNow) this.publish(result.bet, result.userName ?? "Player", game.metadata);
    return this.hydrate(result.bet, result.balance);
  }

  async getHistory(userId: string, gameId?: string, limit = 20) {
    const database = await getDatabase();
    const filters = gameId
      ? and(eq(bets.userId, userId), eq(bets.gameId, gameId))
      : eq(bets.userId, userId);
    const rows = await database
      .select({
        bet: bets,
        seedHash: seedPairs.serverSeedHash,
        clientSeed: seedPairs.clientSeed,
      })
      .from(bets)
      .leftJoin(seedPairs, eq(bets.seedPairId, seedPairs.id))
      .where(filters)
      .orderBy(desc(bets.createdAt))
      .limit(Math.min(Math.max(limit, 1), 100));
    return rows.map((row) =>
      mapBet(
        row.bet,
        row.seedHash
          ? {
              serverSeedHash: row.seedHash,
              clientSeed: row.bet.clientSeedSnapshot ?? row.clientSeed ?? "",
              nonce: row.bet.nonce,
            }
          : null,
      ),
    );
  }

  async getBet(userId: string, betId: string) {
    const database = await getDatabase();
    const [row] = await database
      .select()
      .from(bets)
      .where(and(eq(bets.id, betId), eq(bets.userId, userId)))
      .limit(1);
    if (!row) throw new AppError("NOT_FOUND", "Bet not found", 404);
    return this.hydrate(row);
  }

  async getActiveBet(userId: string, gameId: string) {
    const database = await getDatabase();
    const [row] = await database
      .select()
      .from(bets)
      .where(and(eq(bets.userId, userId), eq(bets.gameId, gameId), eq(bets.status, "active")))
      .orderBy(desc(bets.createdAt))
      .limit(1);
    return row ? this.hydrate(row) : null;
  }

  private async consumeSeed(database: Database, userId: string): Promise<SeedContext> {
    const [existing] = await database
      .select()
      .from(seedPairs)
      .where(and(eq(seedPairs.userId, userId), eq(seedPairs.active, true)))
      .for("update")
      .limit(1);
    const seed = existing ?? (await this.seeds.createWithDatabase(database, userId));
    const nonce = seed.nonce;
    await database.update(seedPairs).set({ nonce: nonce + 1 }).where(eq(seedPairs.id, seed.id));
    const serverSeed = decryptSecret(seed.serverSeedEncrypted);
    return {
      id: seed.id,
      hash: seed.serverSeedHash,
      clientSeed: seed.clientSeed,
      nonce,
      random: new FairRandom(serverSeed, seed.clientSeed, nonce),
    };
  }

  private async findByIdempotencyKey(userId: string, key: string) {
    const database = await getDatabase();
    const [row] = await database
      .select()
      .from(bets)
      .where(and(eq(bets.userId, userId), eq(bets.idempotencyKey, key)))
      .limit(1);
    return row ?? null;
  }

  private async getBetGameId(userId: string, betId: string) {
    const database = await getDatabase();
    const [row] = await database
      .select({ gameId: bets.gameId })
      .from(bets)
      .where(and(eq(bets.id, betId), eq(bets.userId, userId)))
      .limit(1);
    if (!row) throw new AppError("NOT_FOUND", "Bet not found", 404);
    return row.gameId;
  }

  private async hydrate(row: BetRow, balanceCents?: number) {
    const database = await getDatabase();
    let seed = null;
    if (row.seedPairId) {
      const [seedRow] = await database
        .select()
        .from(seedPairs)
        .where(eq(seedPairs.id, row.seedPairId))
        .limit(1);
      if (seedRow) {
        seed = {
          serverSeedHash: seedRow.serverSeedHash,
          clientSeed: row.clientSeedSnapshot ?? seedRow.clientSeed,
          nonce: row.nonce,
        };
      }
    }
    const balance = balanceCents ?? (await this.readBalance(row.userId));
    return mapBet(row, seed, balance);
  }

  private async readBalance(userId: string) {
    const database = await getDatabase();
    const [wallet] = await database
      .select({ balanceCents: wallets.balanceCents })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);
    return wallet?.balanceCents ?? 0;
  }

  private async getBalance(database: Database, userId: string) {
    const [wallet] = await database
      .select({ balanceCents: wallets.balanceCents })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);
    return wallet?.balanceCents ?? 0;
  }

  private publish(row: BetRow, userName: string, metadata: GameMetadata) {
    if (row.status !== "settled") return;
    const event: LiveBetEvent = {
      type: "live-bet",
      id: row.id,
      userId: row.userId,
      name: userName,
      gameId: row.gameId,
      gameName: metadata.name,
      amountCents: row.amountCents,
      multiplier: row.multiplier,
      payoutCents: row.payoutCents,
      win: row.payoutCents > row.amountCents,
      createdAt: row.createdAt.toISOString(),
    };
    getEventBus().publishLiveBet(event);
  }
}
