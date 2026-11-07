import type { InstantGameDefinition, RandomSource } from "../types";
import { gameCatalogById } from "../catalog";
import { playSlot, slotConfigs, slotInputSchema, type SlotConfig } from "../slots/slots";

function createSlotGame(id: SlotConfig["id"]): InstantGameDefinition {
  const config = slotConfigs[id];
  return {
    metadata: gameCatalogById.get(id)!,
    inputSchema: slotInputSchema,
    play: (_input, random: RandomSource) => playSlot(config, random),
  };
}

export const neonFruitsGame = createSlotGame("neon-fruits");
export const goldenRelicGame = createSlotGame("golden-relic");
