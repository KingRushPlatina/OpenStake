import { z } from "zod";
import type { InstantGameDefinition, RandomSource } from "../types";
import { gameCatalogById } from "../catalog";

export const wheelInputSchema = z.object({
  segments: z.union([z.literal(10), z.literal(20), z.literal(30), z.literal(40), z.literal(50)]),
  risk: z.enum(["low", "medium", "high"]),
});

export type WheelRisk = z.infer<typeof wheelInputSchema>["risk"];

const LOW_PATTERN = [2, 1.5, 1.2, 1.1, 1, 0.9, 0.8, 0.7, 0.5, 0.3];
const MEDIUM_PATTERN = [12, 5, 2, 1, 0.5, 0.2, 0.1, 0, 0, 0];

function normalized(values: number[], segments: number) {
  const currentAverage = values.reduce((sum, value) => sum + value, 0) / segments;
  return values.map((value) => Math.floor((value * 0.99 / currentAverage) * 100) / 100);
}

function highRiskValues(segments: number) {
  const values = [segments * 4, segments * 0.5, 3, 1, 0.5, 0.2, 0.1];
  const padded = [...values, ...Array.from({ length: segments - values.length }, () => 0)];
  const currentAverage = padded.reduce((sum, value) => sum + value, 0) / segments;
  return padded.map((value) => Math.floor((value * 0.99 / currentAverage) * 100) / 100);
}

export function getWheelMultipliers(segments: number, risk: WheelRisk) {
  if (risk === "high") {
    const values = highRiskValues(segments);
    const step = Math.max(1, Math.floor(segments / 7));
    const arranged = Array.from({ length: segments }, () => 0);
    values.forEach((value, index) => {
      if (value > 0) arranged[(index * step + 3) % segments] = value;
    });
    return arranged;
  }
  const pattern = risk === "low" ? LOW_PATTERN : MEDIUM_PATTERN;
  const filled = Array.from({ length: segments }, (_, index) => pattern[(index * 7 + 3) % pattern.length]);
  return normalized(filled, segments);
}

export const wheelGame: InstantGameDefinition = {
  metadata: gameCatalogById.get("wheel")!,
  inputSchema: wheelInputSchema,
  play: (input, random: RandomSource) => {
    const parsed = wheelInputSchema.parse(input);
    const multipliers = getWheelMultipliers(parsed.segments, parsed.risk);
    const index = random.int(parsed.segments);
    const multiplier = multipliers[index];

    return {
      multiplier,
      result: {
        segments: parsed.segments,
        risk: parsed.risk,
        index,
        multipliers,
        multiplier,
      },
    };
  },
};
