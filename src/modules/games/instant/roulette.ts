import { z } from "zod";
import type { InstantGameDefinition, RandomSource } from "../types";
import { gameCatalogById } from "../catalog";
import { AppError } from "@/lib/errors";
import {
  ROULETTE_WHEEL,
  isValidRouletteBet,
  rouletteColor,
  settleRouletteBets,
  type RouletteBet,
} from "@/lib/roulette";

export const rouletteInputSchema = z.object({
  bets: z
    .array(
      z.object({
        kind: z.enum([
          "straight",
          "split",
          "street",
          "corner",
          "sixline",
          "column",
          "dozen",
          "red",
          "black",
          "odd",
          "even",
          "low",
          "high",
        ]),
        amountCents: z.number().int().positive().max(100_000_000_000),
        numbers: z.array(z.number().int().min(0).max(36)).min(1).max(6).optional(),
        group: z.number().int().min(1).max(3).optional(),
      }),
    )
    .min(1)
    .max(80),
});

type RouletteInput = z.infer<typeof rouletteInputSchema>;

export function resolveRouletteStake(input: RouletteInput) {
  return input.bets.reduce((total, bet) => total + bet.amountCents, 0);
}

export const rouletteGame: InstantGameDefinition = {
  metadata: gameCatalogById.get("roulette")!,
  inputSchema: rouletteInputSchema,
  resolveAmount: (input) => resolveRouletteStake(input as RouletteInput),
  resolvePayout: (_amountCents, outcome) => {
    const result = outcome.result as { totalPayoutCents?: number };
    return Math.max(0, Math.floor(result.totalPayoutCents ?? 0));
  },
  play: (input, random: RandomSource) => {
    const parsed = rouletteInputSchema.parse(input) as RouletteInput;
    for (const bet of parsed.bets) {
      if (!isValidRouletteBet(bet as RouletteBet)) {
        throw new AppError("INVALID_INPUT", "That bet cannot be placed on the table", 400);
      }
    }

    const wheelIndex = random.int(ROULETTE_WHEEL.length);
    const number = ROULETTE_WHEEL[wheelIndex]!;
    const settlement = settleRouletteBets(parsed.bets as RouletteBet[], number);

    return {
      multiplier: settlement.multiplier,
      result: {
        ...settlement,
        number,
        color: rouletteColor(number),
        wheelIndex,
        bets: parsed.bets,
      },
    };
  },
};
