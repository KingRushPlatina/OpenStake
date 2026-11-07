import { randomInt } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase, type Database } from "@/platform/db/client";
import { faucetClaims, wallets } from "@/platform/db/schema";
import { AppError } from "@/lib/errors";
import { formatCents } from "@/lib/money";
import type { Clock, IdGenerator } from "@/modules/wallet/constants";
import { FAUCET_TARGET_CENTS } from "@/modules/wallet/constants";
import type { LedgerService } from "@/modules/wallet/ledger-service";

export type FaucetRollResult = {
  won: boolean;
  guess: number;
  roll: number;
  amountCents: number;
  balanceCents: number;
  targetCents: number;
};

export class FaucetService {
  constructor(
    private readonly ids: IdGenerator,
    private readonly clock: Clock,
    private readonly ledger: LedgerService,
  ) {}

  async claim(userId: string, guess: number): Promise<FaucetRollResult> {
    if (!Number.isInteger(guess) || guess < 1 || guess > 6) {
      throw new AppError("INVALID_INPUT", "Pick a number from 1 to 6", 400);
    }

    const roll = randomInt(1, 7);
    const database = await getDatabase();

    return database.transaction(async (transaction): Promise<FaucetRollResult> => {
      const tx = transaction as unknown as Database;
      const wallet = await this.ledger.lockWallet(tx, userId);

      if (wallet.balanceCents >= FAUCET_TARGET_CENTS) {
        throw new AppError(
          "FAUCET_BALANCE",
          `Your balance is already at the ${formatCents(FAUCET_TARGET_CENTS)} cap`,
          400,
          { targetCents: FAUCET_TARGET_CENTS },
        );
      }

      if (roll !== guess) {
        return {
          won: false,
          guess,
          roll,
          amountCents: 0,
          balanceCents: wallet.balanceCents,
          targetCents: FAUCET_TARGET_CENTS,
        };
      }

      const amountCents = FAUCET_TARGET_CENTS - wallet.balanceCents;
      await tx.insert(faucetClaims).values({
        id: this.ids.create("fau"),
        userId,
        amountCents,
        claimedAt: this.clock.now(),
      });
      const balance = await this.ledger.move(tx, {
        userId,
        amountCents,
        type: "faucet",
        metadata: { targetCents: FAUCET_TARGET_CENTS, guess, roll },
      });

      return {
        won: true,
        guess,
        roll,
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
