import { z } from "zod";
import type { ProgressionEngine, ProgressionSnapshot } from "./types";
import { gameCatalogById } from "../catalog";

export const minesStartSchema = z.object({
  mines: z.number().int().min(1).max(24),
});

export const minesActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("reveal"), tile: z.number().int().min(0).max(24) }),
  z.object({ type: z.literal("cashout") }),
]);

type MinesSecret = {
  mineTiles: number[];
  revealed: number[];
};

type MinesPublic = {
  mineCount: number;
  revealed: number[];
  multiplier: number;
  nextMultiplier: number;
  picks: number;
  cashoutAllowed: boolean;
};

const TOTAL_TILES = 25;

function combinations(n: number, k: number) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let index = 1; index <= k; index += 1) result = (result * (n - k + index)) / index;
  return result;
}

function multiplierFor(picks: number, mines: number) {
  if (picks === 0) return 1;
  return Math.floor((0.99 * (combinations(TOTAL_TILES, picks) / combinations(TOTAL_TILES - mines, picks))) * 10_000) / 10_000;
}

function publicState(secret: MinesSecret, mines: number): MinesPublic {
  const picks = secret.revealed.length;
  return {
    mineCount: mines,
    revealed: [...secret.revealed],
    multiplier: multiplierFor(picks, mines),
    nextMultiplier: multiplierFor(picks + 1, mines),
    picks,
    cashoutAllowed: picks > 0,
  };
}

function settle(snapshot: ProgressionSnapshot, secret: MinesSecret, publicData: MinesPublic, lost: boolean): ProgressionSnapshot {
  return {
    ...snapshot,
    secret,
    publicState: publicData,
    multiplier: lost ? 0 : publicData.multiplier,
    status: "settled",
    settledResult: {
      ...publicData,
      mineTiles: secret.mineTiles,
      lost,
    },
  };
}

export const minesGame: ProgressionEngine = {
  metadata: gameCatalogById.get("mines")!,
  startSchema: minesStartSchema,
  actionSchema: minesActionSchema,
  start: (input, context) => {
    const parsed = minesStartSchema.parse(input);
    const shuffled = context.random.shuffle(Array.from({ length: TOTAL_TILES }, (_, index) => index));
    const secret: MinesSecret = {
      mineTiles: shuffled.slice(0, parsed.mines).sort((left, right) => left - right),
      revealed: [],
    };
    const publicData = publicState(secret, parsed.mines);
    return {
      secret,
      publicState: publicData,
      multiplier: 1,
      status: "active",
      };
  },
  act: (snapshot, action) => {
    const parsed = minesActionSchema.parse(action);
    const secret = snapshot.secret as MinesSecret;
    const publicData = snapshot.publicState as MinesPublic;

    if (parsed.type === "cashout") {
      if (!publicData.cashoutAllowed) throw new Error("Reveal at least one tile before cashing out");
      return settle(snapshot, secret, publicData, false);
    }

    if (secret.revealed.includes(parsed.tile)) throw new Error("Tile already revealed");
    if (secret.mineTiles.includes(parsed.tile)) {
      const lostPublic = {
        ...publicState(secret, publicData.mineCount),
        revealed: [...secret.revealed, parsed.tile],
      };
      return settle(snapshot, { ...secret, revealed: [...secret.revealed, parsed.tile] }, lostPublic, true);
    }

    const revealed = [...secret.revealed, parsed.tile];
    const nextSecret = { ...secret, revealed };
    const nextPublic = publicState(nextSecret, publicData.mineCount);
    if (revealed.length === TOTAL_TILES - publicData.mineCount) {
      return settle(snapshot, nextSecret, nextPublic, false);
    }
    return {
      ...snapshot,
      secret: nextSecret,
      publicState: nextPublic,
      multiplier: nextPublic.multiplier,
    };
  },
};

export type MinesPublicState = MinesPublic;
