import { z } from "zod";
import type { InstantGameDefinition, RandomSource } from "../types";
import { gameCatalogById } from "../catalog";

const diceInputSchema = z.object({
  direction: z.enum(["over", "under"]),
  chance: z.number().min(2).max(95),
});

export const diceGame: InstantGameDefinition = {
  metadata: gameCatalogById.get("dice")!,
  inputSchema: diceInputSchema,
  play: (input, random: RandomSource) => {
    const parsed = diceInputSchema.parse(input);
    const roll = Math.round(random.next() * 10_000) / 100;
    const threshold = parsed.direction === "under" ? parsed.chance : 100 - parsed.chance;
    const win = parsed.direction === "under" ? roll < threshold : roll > threshold;
    const multiplier = win ? 99 / parsed.chance : 0;

    return {
      multiplier,
      result: {
        roll,
        threshold: Math.round(threshold * 100) / 100,
        direction: parsed.direction,
        chance: parsed.chance,
        win,
      },
    };
  },
};
