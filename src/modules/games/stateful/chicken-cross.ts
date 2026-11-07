import { z } from "zod";
import type { ProgressionEngine, ProgressionSnapshot } from "./types";
import { gameCatalogById } from "../catalog";

export const chickenStartSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard", "expert"]),
});

export const chickenActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("cross") }),
  z.object({ type: z.literal("cashout") }),
]);

type Difficulty = z.infer<typeof chickenStartSchema>["difficulty"];

const SURVIVAL: Record<Difficulty, number> = {
  easy: 0.9,
  medium: 0.75,
  hard: 0.6,
  expert: 0.4,
};

const LANES = 12;

type ChickenSecret = {
  deathLane: number | null;
};

type ChickenPublic = {
  difficulty: Difficulty;
  lanes: number;
  currentLane: number;
  multiplier: number;
  nextMultiplier: number;
  levelMultipliers: number[];
  cashoutAllowed: boolean;
};

function cumulativeMultiplier(difficulty: Difficulty, survived: number) {
  if (survived === 0) return 1;
  const fairStep = 1 / SURVIVAL[difficulty];
  return Math.floor(0.99 * fairStep ** survived * 10_000) / 10_000;
}

function publicState(secret: ChickenSecret, difficulty: Difficulty, currentLane: number): ChickenPublic {
  return {
    difficulty,
    lanes: LANES,
    currentLane,
    multiplier: cumulativeMultiplier(difficulty, currentLane),
    nextMultiplier: cumulativeMultiplier(difficulty, currentLane + 1),
    levelMultipliers: Array.from({ length: LANES + 1 }, (_, lane) => cumulativeMultiplier(difficulty, lane)),
    cashoutAllowed: currentLane > 0,
  };
}

function settle(snapshot: ProgressionSnapshot, secret: ChickenSecret, publicData: ChickenPublic, lost: boolean): ProgressionSnapshot {
  return {
    ...snapshot,
    secret,
    publicState: publicData,
    multiplier: lost ? 0 : publicData.multiplier,
    status: "settled",
    settledResult: {
      ...publicData,
      deathLane: secret.deathLane,
      lost,
    },
  };
}

export const chickenCrossGame: ProgressionEngine = {
  metadata: gameCatalogById.get("chicken-cross")!,
  startSchema: chickenStartSchema,
  actionSchema: chickenActionSchema,
  start: (input, context) => {
    const parsed = chickenStartSchema.parse(input);
    let deathLane: number | null = null;
    for (let lane = 0; lane < LANES; lane += 1) {
      if (context.random.next() >= SURVIVAL[parsed.difficulty]) {
        deathLane = lane;
        break;
      }
    }
    const secret: ChickenSecret = { deathLane };
    const publicData = publicState(secret, parsed.difficulty, 0);
    return {
      secret,
      publicState: publicData,
      multiplier: 1,
      status: "active",
      };
  },
  act: (snapshot, action) => {
    const parsed = chickenActionSchema.parse(action);
    const secret = snapshot.secret as ChickenSecret;
    const publicData = snapshot.publicState as ChickenPublic;

    if (parsed.type === "cashout") {
      if (!publicData.cashoutAllowed) throw new Error("Cross at least one lane before cashing out");
      return settle(snapshot, secret, publicData, false);
    }

    const lane = publicData.currentLane;
    if (secret.deathLane === lane) {
      return settle(snapshot, secret, publicState(secret, publicData.difficulty, lane), true);
    }

    const nextLane = lane + 1;
    const nextPublic = publicState(secret, publicData.difficulty, nextLane);
    if (nextLane >= LANES) {
      return settle(snapshot, secret, nextPublic, false);
    }
    return {
      ...snapshot,
      secret,
      publicState: nextPublic,
      multiplier: nextPublic.multiplier,
    };
  },
};

export type ChickenCrossPublicState = ChickenPublic;
