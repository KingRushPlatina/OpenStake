import { z } from "zod";
import type { ProgressionEngine, ProgressionSnapshot } from "./types";
import { gameCatalogById } from "../catalog";
import { createDeck, pokerValue, shuffleDeck, suitOf } from "../cards";

export const videoPokerStartSchema = z.object({}).strict();

export const videoPokerActionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("draw"),
    holds: z.array(z.number().int().min(0).max(4)).max(5),
  }),
]);

const PAYTABLE = [
  { name: "Royal Flush", multiplier: 250 },
  { name: "Straight Flush", multiplier: 50 },
  { name: "Four of a Kind", multiplier: 25 },
  { name: "Full House", multiplier: 9 },
  { name: "Flush", multiplier: 6 },
  { name: "Straight", multiplier: 4 },
  { name: "Three of a Kind", multiplier: 3 },
  { name: "Two Pair", multiplier: 2 },
  { name: "Jacks or Better", multiplier: 1 },
  { name: "No Win", multiplier: 0 },
] as const;

type VideoPokerSecret = {
  deck: string[];
  cursor: number;
  initialCards: string[];
};

type VideoPokerPublic = {
  initialCards: string[];
  paytable: typeof PAYTABLE;
  phase: "holding";
};

function evaluateHand(cards: string[]) {
  const values = cards.map(pokerValue).sort((left, right) => left - right);
  const suits = cards.map(suitOf);
  const counts = new Map<number, number>();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  const countValues = [...counts.values()].sort((left, right) => right - left);
  const flush = suits.every((suit) => suit === suits[0]);
  const unique = [...new Set(values)];
  const aceLow = unique.join(",") === "2,3,4,5,14";
  const straight = aceLow || (unique.length === 5 && unique[4] - unique[0] === 4);
  const royal = flush && straight && values[0] === 10 && values[4] === 14;
  const four = countValues[0] === 4;
  const fullHouse = countValues[0] === 3 && countValues[1] === 2;
  const three = countValues[0] === 3;
  const twoPair = countValues[0] === 2 && countValues[1] === 2;
  const pairValue = [...counts.entries()].find(([, count]) => count === 2)?.[0] ?? 0;
  const jacksOrBetter = pairValue >= 11;

  if (royal) return PAYTABLE[0];
  if (flush && straight) return PAYTABLE[1];
  if (four) return PAYTABLE[2];
  if (fullHouse) return PAYTABLE[3];
  if (flush) return PAYTABLE[4];
  if (straight) return PAYTABLE[5];
  if (three) return PAYTABLE[6];
  if (twoPair) return PAYTABLE[7];
  if (jacksOrBetter) return PAYTABLE[8];
  return PAYTABLE[9];
}

function publicState(secret: VideoPokerSecret): VideoPokerPublic {
  return {
    initialCards: secret.initialCards,
    paytable: PAYTABLE,
    phase: "holding",
  };
}

export const videoPokerGame: ProgressionEngine = {
  metadata: gameCatalogById.get("video-poker")!,
  startSchema: videoPokerStartSchema,
  actionSchema: videoPokerActionSchema,
  start: (_input, context) => {
    const deck = shuffleDeck(createDeck(1), context.random);
    const initialCards = deck.slice(0, 5);
    const secret: VideoPokerSecret = { deck, cursor: 5, initialCards };
    return {
      secret,
      publicState: publicState(secret),
      multiplier: 1,
      status: "active",
      cashoutAllowed: false,
    };
  },
  act: (snapshot, action) => {
    const parsed = videoPokerActionSchema.parse(action);
    const secret = snapshot.secret as VideoPokerSecret;
    const holds = [...new Set(parsed.holds)];
    const finalCards = secret.initialCards.map((card, index) =>
      holds.includes(index) ? card : secret.deck[secret.cursor++],
    );
    const outcome = evaluateHand(finalCards);
    return {
      ...snapshot,
      secret: { ...secret, initialCards: finalCards },
      publicState: {
        initialCards: secret.initialCards,
        paytable: PAYTABLE,
        phase: "holding",
      },
      multiplier: outcome.multiplier,
      status: "settled",
      cashoutAllowed: false,
      settledResult: {
        initialCards: secret.initialCards,
        finalCards,
        holds,
        handName: outcome.name,
        paytable: PAYTABLE,
        win: outcome.multiplier > 1,
      },
    };
  },
  cashout: (snapshot: ProgressionSnapshot) => snapshot,
};

export type VideoPokerPublicState = VideoPokerPublic;
export { PAYTABLE as videoPokerPaytable };
