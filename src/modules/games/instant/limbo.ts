import { z } from "zod";
import type { InstantGameDefinition, RandomSource } from "../types";
import { gameCatalogById } from "../catalog";

const limboInputSchema = z.object({
  target: z.number().min(1.01).max(1_000_000),
});

const MAX_MULTIPLIER = 1_000_000;

export const limboGame: InstantGameDefinition = {
  metadata: gameCatalogById.get("limbo")!,
  inputSchema: limboInputSchema,
  play: (input, random: RandomSource) => {
    const parsed = limboInputSchema.parse(input);
    const raw = 0.99 / (1 - random.next());
    const result = Math.min(MAX_MULTIPLIER, Math.max(1, Math.floor(raw * 100) / 100));
    const win = result >= parsed.target;

    return {
      multiplier: win ? parsed.target : 0,
      result: {
        result,
        target: parsed.target,
        win,
      },
    };
  },
};
