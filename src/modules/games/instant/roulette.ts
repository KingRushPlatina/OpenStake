import { z } from "zod";
import type { InstantGameDefinition, RandomSource } from "../types";
import { gameCatalogById } from "../catalog";

export type RouletteVariant = "european" | "american";

export type RouletteSpot = {
  id: string;
  label: string;
  numbers: number[];
  payout: number;
  kind: "straight" | "outside" | "dozen" | "column";
};

const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);

export function rouletteColor(number: number) {
  if (number === 0 || number === 37) return "green";
  return RED_NUMBERS.has(number) ? "red" : "black";
}

export function rouletteLabel(number: number) {
  return number === 37 ? "00" : String(number);
}

function straightSpots(variant: RouletteVariant) {
  const last = variant === "american" ? 37 : 36;
  return Array.from({ length: last + 1 }, (_, number) => ({
    id: `straight-${number}`,
    label: rouletteLabel(number),
    numbers: [number],
    payout: 35,
    kind: "straight" as const,
  }));
}

const outsideSpots: RouletteSpot[] = [
  { id: "red", label: "Red", numbers: [...RED_NUMBERS], payout: 1, kind: "outside" },
  {
    id: "black",
    label: "Black",
    numbers: Array.from({ length: 36 }, (_, index) => index + 1).filter((number) => !RED_NUMBERS.has(number)),
    payout: 1,
    kind: "outside",
  },
  {
    id: "odd",
    label: "Odd",
    numbers: Array.from({ length: 36 }, (_, index) => index + 1).filter((number) => number % 2 === 1),
    payout: 1,
    kind: "outside",
  },
  {
    id: "even",
    label: "Even",
    numbers: Array.from({ length: 36 }, (_, index) => index + 1).filter((number) => number % 2 === 0),
    payout: 1,
    kind: "outside",
  },
  { id: "low", label: "1 to 18", numbers: Array.from({ length: 18 }, (_, index) => index + 1), payout: 1, kind: "outside" },
  {
    id: "high",
    label: "19 to 36",
    numbers: Array.from({ length: 18 }, (_, index) => index + 19),
    payout: 1,
    kind: "outside",
  },
  {
    id: "dozen-1",
    label: "1st 12",
    numbers: Array.from({ length: 12 }, (_, index) => index + 1),
    payout: 2,
    kind: "dozen",
  },
  {
    id: "dozen-2",
    label: "2nd 12",
    numbers: Array.from({ length: 12 }, (_, index) => index + 13),
    payout: 2,
    kind: "dozen",
  },
  {
    id: "dozen-3",
    label: "3rd 12",
    numbers: Array.from({ length: 12 }, (_, index) => index + 25),
    payout: 2,
    kind: "dozen",
  },
  {
    id: "column-1",
    label: "Column 1",
    numbers: Array.from({ length: 12 }, (_, index) => index * 3 + 1),
    payout: 2,
    kind: "column",
  },
  {
    id: "column-2",
    label: "Column 2",
    numbers: Array.from({ length: 12 }, (_, index) => index * 3 + 2),
    payout: 2,
    kind: "column",
  },
  {
    id: "column-3",
    label: "Column 3",
    numbers: Array.from({ length: 12 }, (_, index) => index * 3 + 3),
    payout: 2,
    kind: "column",
  },
];

export function getRouletteSpots(variant: RouletteVariant) {
  return [...straightSpots(variant), ...outsideSpots];
}

const SPOT_MAPS = {
  european: new Map(getRouletteSpots("european").map((spot) => [spot.id, spot])),
  american: new Map(getRouletteSpots("american").map((spot) => [spot.id, spot])),
};

export const rouletteInputSchema = z.object({
  variant: z.enum(["european", "american"]),
  bets: z
    .array(
      z.object({
        spotId: z.string().min(1),
        amountCents: z.number().int().min(1),
      }),
    )
    .min(1)
    .max(30),
});

export const rouletteGame: InstantGameDefinition = {
  metadata: gameCatalogById.get("roulette")!,
  inputSchema: rouletteInputSchema,
  resolveAmount: (input) => {
    const parsed = rouletteInputSchema.parse(input);
    return parsed.bets.reduce((sum, bet) => sum + bet.amountCents, 0);
  },
  play: (input, random: RandomSource) => {
    const parsed = rouletteInputSchema.parse(input);
    const spots = SPOT_MAPS[parsed.variant];
    const unique = new Set(parsed.bets.map((bet) => bet.spotId));
    if (unique.size !== parsed.bets.length) throw new Error("Each spot can only be bet once");
    const bets = parsed.bets.map((bet) => {
      const spot = spots.get(bet.spotId);
      if (!spot) throw new Error("Invalid roulette spot");
      return { ...bet, spot };
    });
    const totalBet = bets.reduce((sum, bet) => sum + bet.amountCents, 0);
    const universe = parsed.variant === "american" ? 38 : 37;
    const winner = random.int(universe);
    const settledBets = bets.map((bet) => {
      const won = bet.spot.numbers.includes(winner);
      const payoutCents = won ? bet.amountCents * (bet.spot.payout + 1) : 0;
      return {
        spotId: bet.spotId,
        label: bet.spot.label,
        amountCents: bet.amountCents,
        won,
        payoutCents,
      };
    });
    const totalPayout = settledBets.reduce((sum, bet) => sum + bet.payoutCents, 0);

    return {
      multiplier: totalBet === 0 ? 0 : totalPayout / totalBet,
      result: {
        variant: parsed.variant,
        winner,
        winnerLabel: rouletteLabel(winner),
        color: rouletteColor(winner),
        bets: settledBets,
        totalBet,
        totalPayout,
      },
    };
  },
};
