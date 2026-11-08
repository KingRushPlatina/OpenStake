import { z } from "zod";
import type { ProgressionEngine, ProgressionSnapshot } from "./types";
import { gameCatalogById } from "../catalog";
import {
  LIMBO_GROWTH_MS,
  limboCrashDelayMs,
  limboCrashFromRandom,
  limboMultiplierAtElapsed,
} from "@/lib/limbo";

export const limboStartSchema = z.object({}).strict();

export const limboActionSchema = z.object({ type: z.literal("cashout") }).strict();

type LimboSecret = {
  crash: number;
  startedAtMs: number;
};

type LimboPublic = {
  multiplier: number;
  startedAtMs: number;
  growthMs: number;
  cashoutAllowed: boolean;
};

function publicState(startedAtMs: number): LimboPublic {
  return {
    multiplier: 1,
    startedAtMs,
    growthMs: LIMBO_GROWTH_MS,
    cashoutAllowed: true,
  };
}

function settleLost(
  snapshot: ProgressionSnapshot,
  secret: LimboSecret,
  publicData: LimboPublic,
): ProgressionSnapshot {
  return {
    ...snapshot,
    secret,
    publicState: { ...publicData, multiplier: 0 },
    multiplier: 0,
    status: "settled",
    settledResult: {
      ...publicData,
      multiplier: 0,
      crash: secret.crash,
      lost: true,
    },
  };
}

function hasCrashed(secret: LimboSecret, nowMs: number) {
  return nowMs - secret.startedAtMs >= limboCrashDelayMs(secret.crash);
}

export const limboGame: ProgressionEngine = {
  metadata: gameCatalogById.get("limbo")!,
  startSchema: limboStartSchema,
  actionSchema: limboActionSchema,
  start: (input, context) => {
    limboStartSchema.parse(input);
    const startedAtMs = context.nowMs ?? Date.now();
    const crash = limboCrashFromRandom(context.random.next());
    const secret: LimboSecret = { crash, startedAtMs };
    const publicData = publicState(startedAtMs);
    const snapshot: ProgressionSnapshot = {
      secret,
      publicState: publicData,
      multiplier: 1,
      status: "active",
    };
    // A 1.00x draw crashes on the runway, before the plane can leave the ground.
    if (crash <= 1) return settleLost(snapshot, secret, publicData);
    return snapshot;
  },
  act: (snapshot, action, context) => {
    limboActionSchema.parse(action);
    const secret = snapshot.secret as LimboSecret;
    const publicData = snapshot.publicState as LimboPublic;
    const nowMs = context?.nowMs ?? secret.startedAtMs;

    if (hasCrashed(secret, nowMs)) return settleLost(snapshot, secret, publicData);

    const multiplier = Math.min(limboMultiplierAtElapsed(nowMs - secret.startedAtMs), secret.crash);
    return {
      ...snapshot,
      multiplier,
      status: "settled",
      settledResult: {
        ...publicData,
        multiplier,
        crash: secret.crash,
        lost: false,
      },
    };
  },
  checkExpired: (snapshot, context) => {
    const secret = snapshot.secret as LimboSecret;
    const publicData = snapshot.publicState as LimboPublic;
    if (!hasCrashed(secret, context.nowMs)) return null;
    return settleLost(snapshot, secret, publicData);
  },
};

export type LimboPublicState = LimboPublic;
