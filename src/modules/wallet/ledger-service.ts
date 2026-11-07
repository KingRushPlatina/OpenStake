import { eq, sql } from "drizzle-orm";
import { ledgerEntries, playerStats, wallets } from "@/platform/db/schema";
import type { Database } from "@/platform/db/client";
import type { Clock, IdGenerator, LedgerType } from "@/modules/wallet/constants";

export type WalletMove = {
  userId: string;
  amountCents: number;
  type: LedgerType;
  betId?: string;
  metadata?: Record<string, unknown>;
};

export class LedgerService {
  constructor(
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
  ) {}

  async lockWallet(database: Database, userId: string) {
    const [wallet] = await database
      .select()
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .for("update")
      .limit(1);
    if (!wallet) throw new Error("Wallet not found");
    return wallet;
  }

  async move(database: Database, move: WalletMove) {
    const wallet = await this.lockWallet(database, move.userId);
    const nextBalance = wallet.balanceCents + move.amountCents;
    await database
      .update(wallets)
      .set({
        balanceCents: nextBalance,
        version: wallet.version + 1,
        updatedAt: this.clock.now(),
      })
      .where(eq(wallets.userId, move.userId));
    await database.insert(ledgerEntries).values({
      id: this.ids.create("led"),
      userId: move.userId,
      type: move.type,
      amountCents: move.amountCents,
      balanceAfterCents: nextBalance,
      betId: move.betId,
      metadata: move.metadata,
      createdAt: this.clock.now(),
    });
    return nextBalance;
  }

  async recordPlacement(database: Database, userId: string, amountCents: number) {
    await database
      .update(playerStats)
      .set({
        totalBets: sql`${playerStats.totalBets} + 1`,
        wageredCents: sql`${playerStats.wageredCents} + ${amountCents}`,
        netProfitCents: sql`${playerStats.netProfitCents} - ${amountCents}`,
        updatedAt: this.clock.now(),
      })
      .where(eq(playerStats.userId, userId));
  }

  async recordRefund(database: Database, userId: string, amountCents: number) {
    await database
      .update(playerStats)
      .set({
        totalBets: sql`greatest(${playerStats.totalBets} - 1, 0)`,
        wageredCents: sql`greatest(${playerStats.wageredCents} - ${amountCents}, 0)`,
        netProfitCents: sql`${playerStats.netProfitCents} + ${amountCents}`,
        updatedAt: this.clock.now(),
      })
      .where(eq(playerStats.userId, userId));
  }

  async recordAdditionalStake(database: Database, userId: string, amountCents: number) {
    await database
      .update(playerStats)
      .set({
        wageredCents: sql`${playerStats.wageredCents} + ${amountCents}`,
        netProfitCents: sql`${playerStats.netProfitCents} - ${amountCents}`,
        updatedAt: this.clock.now(),
      })
      .where(eq(playerStats.userId, userId));
  }

  async recordSettlement(database: Database, userId: string, payoutCents: number, multiplier: number) {
    await database
      .update(playerStats)
      .set({
        payoutCents: sql`${playerStats.payoutCents} + ${payoutCents}`,
        netProfitCents: sql`${playerStats.netProfitCents} + ${payoutCents}`,
        biggestWinCents: sql`greatest(${playerStats.biggestWinCents}, ${payoutCents})`,
        biggestMultiplier: sql`greatest(${playerStats.biggestMultiplier}, ${multiplier})`,
        updatedAt: this.clock.now(),
      })
      .where(eq(playerStats.userId, userId));
  }
}
