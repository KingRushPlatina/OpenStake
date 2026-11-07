import { eq } from "drizzle-orm";
import { getDatabase, type Database } from "@/platform/db/client";
import { faucetClaims, wallets } from "@/platform/db/schema";
import { AppError } from "@/lib/errors";
import type { Clock, IdGenerator } from "@/modules/wallet/constants";
import { FAUCET_TARGET_CENTS } from "@/modules/wallet/constants";
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
      if (wallet.balanceCents >= FAUCET_TARGET_CENTS) {
        throw new AppError("FAUCET_BALANCE", "Your balance is already at 100 USD", 400, {
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
        targetCents: FAUCET_TARGET_CENTS,
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
    const balanceCents = wallet?.balanceCents ?? 0;
    const belowTarget = balanceCents < FAUCET_TARGET_CENTS;
    return {
      available: belowTarget,
      amountCents: Math.max(0, FAUCET_TARGET_CENTS - balanceCents),
      targetCents: FAUCET_TARGET_CENTS,
    };
  }
}
