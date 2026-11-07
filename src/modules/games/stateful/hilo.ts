import { z } from "zod";
import type { ProgressionEngine, ProgressionSnapshot } from "./types";
import { gameCatalogById } from "../catalog";
import { createDeck, pokerValue, shuffleDeck } from "../cards";

export const hiloStartSchema = z.object({}).strict();

export const hiloActionSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("higher") }),
  z.object({ type: z.literal("lower") }),
  z.object({ type: z.literal("cashout") }),
]);

type HiloSecret = {
  shoe: string[];
  cursor: number;
  current: string;
  history: { card: string; direction: "higher" | "lower"; won: boolean; multiplier: number }[];
};

type HiloPublic = {
  currentCard: string;
  multiplier: number;
  higherMultiplier: number | null;
  lowerMultiplier: number | null;
  history: HiloSecret["history"];
  cashoutAllowed: boolean;
  cardsRemaining: number;
};

function odds(shoe: string[], cursor: number, card: string) {
  const currentValue = pokerValue(card);
  let higher = 0;
  let lower = 0;
  let total = 0;
  for (let index = cursor; index < shoe.length; index += 1) {
    const value = pokerValue(shoe[index]);
    total += 1;
    if (value > currentValue) higher += 1;
    if (value < currentValue) lower += 1;
  }
  return {
    higher: total > 0 && higher > 0 ? Math.floor((0.99 / (higher / total)) * 10_000) / 10_000 : null,
    lower: total > 0 && lower > 0 ? Math.floor((0.99 / (lower / total)) * 10_000) / 10_000 : null,
    total,
    higherCount: higher,
    lowerCount: lower,
  };
}

function publicState(secret: HiloSecret, multiplier: number): HiloPublic {
  const next = odds(secret.shoe, secret.cursor, secret.current);
  return {
    currentCard: secret.current,
    multiplier,
    higherMultiplier: next.higher,
    lowerMultiplier: next.lower,
    history: secret.history,
    cashoutAllowed: multiplier > 1,
    cardsRemaining: next.total,
  };
}

function settle(snapshot: ProgressionSnapshot, secret: HiloSecret, publicData: HiloPublic, lost: boolean, finalCard?: string): ProgressionSnapshot {
  return {
    ...snapshot,
    secret,
    publicState: publicData,
    multiplier: lost ? 0 : publicData.multiplier,
    status: "settled",
    settledResult: {
      ...publicData,
      finalCard: finalCard ?? null,
      lost,
    },
  };
}

export const hiloGame: ProgressionEngine = {
  metadata: gameCatalogById.get("hilo")!,
  startSchema: hiloStartSchema,
  actionSchema: hiloActionSchema,
  start: (_input, context) => {
    const shoe = shuffleDeck(createDeck(6), context.random);
    const current = shoe[0];
    const secret: HiloSecret = { shoe, cursor: 1, current, history: [] };
    const publicData = publicState(secret, 1);
    return {
      secret,
      publicState: publicData,
      multiplier: 1,
      status: "active",
      };
  },
  act: (snapshot, action) => {
    const parsed = hiloActionSchema.parse(action);
    const secret = snapshot.secret as HiloSecret;
    const publicData = snapshot.publicState as HiloPublic;

    if (parsed.type === "cashout") {
      if (!publicData.cashoutAllowed) throw new Error("Win at least one round before cashing out");
      return settle(snapshot, secret, publicData, false);
    }

    const next = odds(secret.shoe, secret.cursor, secret.current);
    const probability =
      parsed.type === "higher" ? next.higherCount / next.total : next.lowerCount / next.total;
    if (!Number.isFinite(probability) || probability <= 0) throw new Error("That side has no available cards");

    const drawn = secret.shoe[secret.cursor];
    const drawnValue = pokerValue(drawn);
    const currentValue = pokerValue(secret.current);
    const won =
      parsed.type === "higher" ? drawnValue > currentValue : drawnValue < currentValue;
    const edge = publicData.history.length === 0 ? 0.99 : 1;
    const stepMultiplier = won ? edge / probability : 0;
    const multiplier = won
      ? Math.floor(publicData.multiplier * stepMultiplier * 10_000) / 10_000
      : 0;
    const nextSecret: HiloSecret = {
      ...secret,
      cursor: secret.cursor + 1,
      current: drawn,
      history: [...secret.history, { card: drawn, direction: parsed.type, won, multiplier }],
    };
    const nextPublic = publicState(nextSecret, multiplier);

    if (!won) {
      return settle(snapshot, nextSecret, nextPublic, true, drawn);
    }
    if (nextSecret.cursor >= nextSecret.shoe.length) {
      return settle(snapshot, nextSecret, nextPublic, false, drawn);
    }
    return {
      ...snapshot,
      secret: nextSecret,
      publicState: nextPublic,
      multiplier,
    };
  },
};

export type HiloPublicState = HiloPublic;
