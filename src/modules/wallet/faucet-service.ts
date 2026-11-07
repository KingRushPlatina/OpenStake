import { eq, sql } from "drizzle-orm";
import { getDatabase, type Database } from "@/platform/db/client";
import { faucetClaims, wallets } from "@/platform/db/schema";
import { AppError } from "@/lib/errors";
import type { Clock, IdGenerator } from "@/modules/wallet/constants";
import { FAUCET_COOLDOWN_MS, FAUCET_TARGET_CENTS } from "@/modules/wallet/constants";
import type { LedgerService } from "@/modules/wallet/ledger-service";

export class FaucetService {
  constructor(
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly ledger: LedgerService,
  ) {}

  async claim(userId: string) {
    const database = await getDatabase();
    return database.transaction(async (transaction) => {
      const tx = transaction as unknown as Database;
      const wallet = await this.ledger.lockWallet(tx, userId);
      const now = this.clock.now();
      const [lastClaim] = await tx
        .select()
        .from(faucetClaims)
        .where(eq(faucetClaims.userId, userId))
        .orderBy(sql`${faucetClaims.claimedAt} desc`)
        .limit(1);
      const nextClaimAt = lastClaim
        ? new Date(lastClaim.claimedAt.getTime() + FAUCET_COOLDOWN_MS)
        : now;
      if (now.getTime() < nextClaimAt.getTime()) {
        throw new AppError("FAUCET_COOLDOWN", "The faucet is cooling down", 429, {
          nextClaimAt: nextClaimAt.toISOString(),
        });
      }
      if (wallet.balanceCents >= FAUCET_TARGET_CENTS) {
        throw new AppError("FAUCET_BALANCE", "The faucet is available below 100 USD", 400, {
          targetCents: FAUCET_TARGET_CENTS,
        });
      }
      const amountCents = FAUCET_TARGET_CENTS - wallet.balanceCents;
      await tx.insert(faucetClaims).values({
        id: this.ids.create("fau"),
        userId,
        amountCents,
        claimedAt: now,
      });
      const balance = await this.ledger.move(tx, {
        userId,
        amountCents,
        type: "faucet",
        metadata: { targetCents: FAUCET_TARGET_CENTS },
      });
      return {
        amountCents,
        balanceCents: balance,
        nextClaimAt: new Date(now.getTime() + FAUCET_COOLDOWN_MS).toISOString(),
      };
    });
  }

  async getClaimState(userId: string) {
    const database = await getDatabase();
    const [wallet] = await database
      .select({ balanceCents: wallets.balanceCents })
      .from(wallets)
      .where(eq(wallets.userId, userId))
      .limit(1);
    const [lastClaim] = await database
      .select()
      .from(faucetClaims)
      .where(eq(faucetClaims.userId, userId))
      .orderBy(sql`${faucetClaims.claimedAt} desc`)
      .limit(1);
    const now = this.clock.now().getTime();
    const nextClaimAt = lastClaim
      ? new Date(lastClaim.claimedAt.getTime() + FAUCET_COOLDOWN_MS)
      : new Date(now);
    return {
      available: (wallet?.balanceCents ?? 0) < FAUCET_TARGET_CENTS && now >= nextClaimAt.getTime(),
      amountCents: Math.max(0, FAUCET_TARGET_CENTS - (wallet?.balanceCents ?? 0)),
      nextClaimAt: nextClaimAt.toISOString(),
      targetCents: FAUCET_TARGET_CENTS,
    };
  }
}
