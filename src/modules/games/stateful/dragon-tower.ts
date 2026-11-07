import { z } from "zod";
import type { ProgressionEngine, ProgressionSnapshot } from "./types";
import { multiplierFromProbability } from "./types";
import { gameCatalogById } from "../catalog";

export const dragonTowerStartSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
});

export const dragonTowerActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("pick"), tile: z.number().int().min(0).max(3) }),
  z.object({ type: z.literal("cashout") }),
]);

type Difficulty = z.infer<typeof dragonTowerStartSchema>["difficulty"];

const DIFFICULTIES: Record<Difficulty, { tiles: number; dragons: number }> = {
  easy: { tiles: 3, dragons: 1 },
  medium: { tiles: 2, dragons: 1 },
  hard: { tiles: 3, dragons: 2 },
  expert: { tiles: 4, dragons: 3 },
};

const LEVELS = 9;

type DragonSecret = {
  rows: number[][];
  revealed: number[];
};

type DragonPublic = {
  difficulty: Difficulty;
  levels: number;
  tilesPerRow: number;
  currentLevel: number;
  revealed: number[];
  multiplier: number;
  nextMultiplier: number;
  levelMultipliers: number[];
  cashoutAllowed: boolean;
};

function levelMultiplier(difficulty: Difficulty) {
  const config = DIFFICULTIES[difficulty];
  return multiplierFromProbability((config.tiles - config.dragons) / config.tiles);
}

function cumulativeMultiplier(difficulty: Difficulty, completedLevels: number) {
  if (completedLevels === 0) return 1;
  return Math.floor(0.99 * (levelMultiplier(difficulty) / 0.99) ** completedLevels * 10_000) / 10_000;
}

function publicState(secret: DragonSecret, difficulty: Difficulty, currentLevel: number): DragonPublic {
  return {
    difficulty,
    levels: LEVELS,
    tilesPerRow: DIFFICULTIES[difficulty].tiles,
    currentLevel,
    revealed: [...secret.revealed],
    multiplier: cumulativeMultiplier(difficulty, secret.revealed.length),
    nextMultiplier: cumulativeMultiplier(difficulty, secret.revealed.length + 1),
    levelMultipliers: Array.from({ length: LEVELS + 1 }, (_, level) => cumulativeMultiplier(difficulty, level)),
    cashoutAllowed: secret.revealed.length > 0,
  };
}

function settle(snapshot: ProgressionSnapshot, secret: DragonSecret, publicData: DragonPublic, lost: boolean): ProgressionSnapshot {
  return {
    ...snapshot,
    secret,
    publicState: publicData,
    multiplier: lost ? 0 : publicData.multiplier,
    status: "settled",
    cashoutAllowed: false,
    settledResult: {
      ...publicData,
      rows: secret.rows,
      lost,
    },
  };
}

export const dragonTowerGame: ProgressionEngine = {
  metadata: gameCatalogById.get("dragon-tower")!,
  startSchema: dragonTowerStartSchema,
  actionSchema: dragonTowerActionSchema,
  start: (input, context) => {
    const parsed = dragonTowerStartSchema.parse(input);
    const config = DIFFICULTIES[parsed.difficulty];
    const rows = Array.from({ length: LEVELS }, () => {
      const tiles = context.random.shuffle(Array.from({ length: config.tiles }, (_, index) => index));
      return tiles.slice(0, config.dragons).sort((left, right) => left - right);
    });
    const secret: DragonSecret = { rows, revealed: [] };
    const publicData = publicState(secret, parsed.difficulty, 0);
    return {
      secret,
      publicState: publicData,
      multiplier: 1,
      status: "active",
      cashoutAllowed: false,
    };
  },
  act: (snapshot, action) => {
    const parsed = dragonTowerActionSchema.parse(action);
    const secret = snapshot.secret as DragonSecret;
    const publicData = snapshot.publicState as DragonPublic;

    if (parsed.type === "cashout") {
      if (!publicData.cashoutAllowed) throw new Error("Complete a level before cashing out");
      return settle(snapshot, secret, publicData, false);
    }

    if (parsed.tile >= publicData.tilesPerRow) throw new Error("Invalid tile");
    const currentRow = secret.rows[publicData.currentLevel];
    const revealed = [...secret.revealed, parsed.tile];
    const nextSecret = { ...secret, revealed };

    if (currentRow.includes(parsed.tile)) {
      return settle(snapshot, nextSecret, publicState(nextSecret, publicData.difficulty, publicData.currentLevel), true);
    }

    const nextLevel = publicData.currentLevel + 1;
    const nextPublic = publicState(nextSecret, publicData.difficulty, nextLevel);
    if (nextLevel >= LEVELS) {
      return settle(snapshot, nextSecret, nextPublic, false);
    }
    return {
      ...snapshot,
      secret: nextSecret,
      publicState: nextPublic,
      multiplier: nextPublic.multiplier,
      cashoutAllowed: true,
    };
  },
  cashout: (snapshot) => {
    const secret = snapshot.secret as DragonSecret;
    const publicData = snapshot.publicState as DragonPublic;
    if (!publicData.cashoutAllowed) throw new Error("Nothing to cash out");
    return settle(snapshot, secret, publicData, false);
  },
};

export type DragonTowerPublicState = DragonPublic;
