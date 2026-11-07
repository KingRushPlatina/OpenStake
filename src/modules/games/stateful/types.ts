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
};

export type ProgressionEngine = {
  metadata: GameMetadata;
  startSchema: z.ZodType;
  actionSchema: z.ZodType;
  resolveStake?: (input: unknown, requestedAmountCents: number) => number;
  start: (input: unknown, context: ProgressionStartContext) => ProgressionSnapshot;
  act: (snapshot: ProgressionSnapshot, action: unknown) => ProgressionSnapshot;
};


export function multiplierFromProbability(survivalProbability: number) {
  return Math.floor((0.99 / survivalProbability) * 10_000) / 10_000;
}
