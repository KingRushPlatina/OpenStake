import { z } from "zod";
import type { InstantGameDefinition, RandomSource } from "../types";
import { gameCatalogById } from "../catalog";

const riskSchema = z.enum(["low", "medium", "high"]);
export type KenoRisk = z.infer<typeof riskSchema>;

export const kenoInputSchema = z.object({
  picks: z.array(z.number().int().min(1).max(40)).min(1).max(10),
  risk: riskSchema,
});

const MIN_HITS: Record<number, number> = {
  1: 1,
  2: 2,
  3: 2,
  4: 2,
  5: 3,
  6: 3,
  7: 4,
  8: 4,
  9: 5,
  10: 5,
};

const RISK_SHAPE: Record<KenoRisk, number> = { low: 2, medium: 3, high: 5 };
const RISK_CAP: Record<KenoRisk, number> = { low: 100, medium: 1_000, high: 10_000 };
const TARGET_RTP = 0.99;
const TOTAL_DRAW = 10;
const TOTAL_NUMBERS = 40;

function combinations(n: number, k: number) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let index = 1; index <= k; index += 1) {
    result = (result * (n - k + index)) / index;
  }
  return Math.round(result);
}

function hitProbabilities(picks: number) {
  const total = combinations(TOTAL_NUMBERS, TOTAL_DRAW);
  return Array.from({ length: picks + 1 }, (_, hits) => {
    return (combinations(picks, hits) * combinations(TOTAL_NUMBERS - picks, TOTAL_DRAW - hits)) / total;
  });
}

function buildTable(picks: number, risk: KenoRisk) {
  const probabilities = hitProbabilities(picks);
  const start = MIN_HITS[picks];
  const shape = Array.from({ length: picks + 1 }, (_, hits) => {
    if (hits < start) return 0;
    return RISK_SHAPE[risk] ** (hits - start);
  });
  const rawRtp = shape.reduce((sum, value, hits) => sum + value * probabilities[hits], 0);
  const table = shape.map((value) =>
    value === 0 ? 0 : Math.min(RISK_CAP[risk], Math.floor(((value * TARGET_RTP) / rawRtp) * 10_000) / 10_000),
  );

  const currentRtp = table.reduce((sum, value, hits) => sum + value * probabilities[hits], 0);
  const balancer = start;
  table[balancer] =
    Math.floor((table[balancer] + (TARGET_RTP - currentRtp) / probabilities[balancer]) * 10_000) / 10_000;
  return table;
}

const tableCache = new Map<string, number[]>();

export function getKenoPaytable(picks: number, risk: KenoRisk) {
  const key = `${picks}:${risk}`;
  const cached = tableCache.get(key);
  if (cached) return cached;
  const table = buildTable(picks, risk);
  tableCache.set(key, table);
  return table;
}

export const kenoGame: InstantGameDefinition = {
  metadata: gameCatalogById.get("keno")!,
  inputSchema: kenoInputSchema,
  play: (input, random: RandomSource) => {
    const parsed = kenoInputSchema.parse(input);
    const picks = [...new Set(parsed.picks)];
    if (picks.length < 1) throw new Error("Select at least one number");
    const pool = Array.from({ length: TOTAL_NUMBERS }, (_, index) => index + 1);
    const drawn = random.shuffle(pool).slice(0, TOTAL_DRAW);
    const hits = drawn.filter((number) => picks.includes(number));
    const table = getKenoPaytable(picks.length, parsed.risk);
    const multiplier = table[hits.length] ?? 0;

    return {
      multiplier,
      result: {
        picks: picks.sort((left, right) => left - right),
        drawn: drawn.sort((left, right) => left - right),
        hits: hits.sort((left, right) => left - right),
        hitCount: hits.length,
        risk: parsed.risk,
        payoutTable: table,
      },
    };
  },
};
