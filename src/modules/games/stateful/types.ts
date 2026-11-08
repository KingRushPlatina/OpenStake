import type { z } from "zod";
import type { GameMetadata, RandomSource } from "@/modules/games/types";

export type ProgressionSnapshot = {
  secret: unknown;
  publicState: Record<string, unknown>;
  multiplier: number;
  status: "active" | "settled";
  settledResult?: Record<string, unknown>;
  payoutCents?: number;
  additionalStakeCents?: number;
};

export type ProgressionStartContext = {
  betCents: number;
  random: RandomSource;
  nowMs?: number;
};

export type ProgressionActionContext = {
  nowMs?: number;
};

export type ProgressionEngine = {
  metadata: GameMetadata;
  startSchema: z.ZodType;
  actionSchema: z.ZodType;
  resolveStake?: (input: unknown, requestedAmountCents: number) => number;
  start: (input: unknown, context: ProgressionStartContext) => ProgressionSnapshot;
  act: (snapshot: ProgressionSnapshot, action: unknown, context?: ProgressionActionContext) => ProgressionSnapshot;
  /** Time-based rounds (crash games) settle themselves once their window closes. */
  checkExpired?: (snapshot: ProgressionSnapshot, context: { nowMs: number }) => ProgressionSnapshot | null;
};


export function multiplierFromProbability(survivalProbability: number) {
  return Math.floor((0.99 / survivalProbability) * 10_000) / 10_000;
}

export function progressionPayoutCents(
  stakeCents: number,
  multiplier: number,
  explicitPayout: number | undefined,
  maxWinMultiplier: number,
) {
  const payout = explicitPayout ?? Math.floor(stakeCents * multiplier);
  return Math.max(0, Math.min(payout, Math.floor(stakeCents * maxWinMultiplier)));
}
