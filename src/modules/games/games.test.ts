import { describe, expect, it } from "vitest";
import { blackjackGame } from "@/modules/games/stateful/blackjack";
import { blackjackValue, createDeck, rankOf, suitOf } from "@/modules/games/cards";
import type { RandomSource } from "@/modules/games/types";
import type { ProgressionSnapshot } from "@/modules/games/stateful/types";
import type { BlackjackState } from "@/types/blackjack";

type SettledState = BlackjackState & {
  dealerBlackjack: boolean;
  insurancePayout: number;
  payouts: { betCents: number; payoutCents: number; outcome: string }[];
  totalPayout: number;
};

class ScriptedRandom implements RandomSource {
  constructor(private readonly deck: string[]) {}
  next() {
    return 0.5;
  }
  int() {
    return 0;
  }
  pick<T>(items: readonly T[]) {
    return items[0];
  }
  shuffle<T>() {
    return this.deck as unknown as T[];
  }
}

function deckWith(firstCards: string[]) {
  const remaining = createDeck(6);
  for (const card of firstCards) {
    const index = remaining.indexOf(card);
    if (index >= 0) remaining.splice(index, 1);
  }
  return [...firstCards, ...remaining];
}

function startWith(firstCards: string[], betCents = 100) {
  return blackjackGame.start({}, { betCents, random: new ScriptedRandom(deckWith(firstCards)) });
}

function settledResult(snapshot: ProgressionSnapshot) {
  return snapshot.settledResult as unknown as SettledState;
}

function play(snapshot: ProgressionSnapshot, action: unknown) {
  return blackjackGame.act(snapshot, action);
}

describe("cards", () => {
  it("builds a six-deck shoe with every rank and suit", () => {
    const shoe = createDeck(6);
    expect(shoe).toHaveLength(312);
    expect(new Set(shoe).size).toBe(52);
    expect(shoe.every((card) => rankOf(card).length > 0 && suitOf(card).length === 1)).toBe(true);
  });

  it("counts aces as soft eleven and reduces them on bust", () => {
    expect(blackjackValue(["AS", "6H"])).toEqual({ total: 17, soft: true });
    expect(blackjackValue(["AS", "6H", "KH"])).toEqual({ total: 17, soft: false });
    expect(blackjackValue(["AS", "AH", "9D"])).toEqual({ total: 21, soft: true });
  });
});

describe("blackjack", () => {
  it("pays a natural blackjack at three to two", () => {
    const snapshot = startWith(["AS", "KH", "9D", "7C"]);
    expect(snapshot.status).toBe("settled");
    expect(snapshot.multiplier).toBe(2.5);
    const result = settledResult(snapshot);
    expect(result.totalPayout).toBe(250);
    expect(result.payouts[0]?.outcome).toBe("blackjack");
  });

  it("loses to a dealer blackjack", () => {
    const snapshot = startWith(["10S", "9H", "10D", "AC"]);
    expect(snapshot.status).toBe("settled");
    expect(snapshot.multiplier).toBe(0);
    expect(settledResult(snapshot).dealerBlackjack).toBe(true);
  });

  it("settles a stand and draws the dealer to seventeen or more", () => {
    const start = startWith(["10S", "9H", "9D", "7C", "6S"]);
    expect(start.status).toBe("active");
    const settled = play(start, { type: "stand" });
    expect(settled.status).toBe("settled");
    expect(settled.multiplier).toBe(2);
    expect(settledResult(settled).dealerTotal).toBe(22);
  });

  it("charges an extra stake on double and pays the doubled hand", () => {
    const start = startWith(["5S", "6H", "9D", "7C", "10S", "6H"]);
    const doubled = play(start, { type: "double" });
    expect(doubled.status).toBe("settled");
    expect(doubled.additionalStakeCents).toBe(100);
    expect(doubled.multiplier).toBe(2);
    const result = settledResult(doubled);
    expect(result.totalStake).toBe(200);
    expect(result.totalPayout).toBe(400);
  });

  it("creates a second hand on split and settles both", () => {
    const start = startWith(["8S", "8H", "9D", "9C", "10S", "10H"]);
    const split = play(start, { type: "split" });
    expect(split.status).toBe("active");
    expect(split.additionalStakeCents).toBe(100);
    expect(split.publicState.hands).toHaveLength(2);
    const firstStand = play(split, { type: "stand" });
    const settled = play(firstStand, { type: "stand" });
    expect(settled.status).toBe("settled");
    expect(settled.multiplier).toBe(1);
    expect(settledResult(settled).payouts).toHaveLength(2);
  });

  it("pays insurance when the dealer has blackjack", () => {
    const start = startWith(["KH", "QS", "AD", "KC"]);
    expect(start.publicState.phase).toBe("insurance");
    const insured = play(start, { type: "take-insurance" });
    expect(insured.status).toBe("settled");
    expect(insured.additionalStakeCents).toBe(50);
    expect(insured.multiplier).toBe(1);
    expect(settledResult(insured).insurancePayout).toBe(150);
  });

  it("declines insurance and loses the hand to a dealer blackjack", () => {
    const start = startWith(["KH", "QS", "AD", "KC"]);
    const settled = play(start, { type: "decline-insurance" });
    expect(settled.status).toBe("settled");
    expect(settled.multiplier).toBe(0);
    expect(settledResult(settled).insurancePayout).toBe(0);
  });

  it("busts the player and skips the dealer draw", () => {
    const start = startWith(["10S", "6H", "9D", "7C", "10D"]);
    const settled = play(start, { type: "hit" });
    expect(settled.status).toBe("settled");
    expect(settled.multiplier).toBe(0);
    expect(settledResult(settled).dealerCards).toHaveLength(2);
  });

  it("rejects actions after the round is settled", () => {
    const start = startWith(["10S", "9H", "9D", "7C", "6S"]);
    const settled = play(start, { type: "stand" });
    expect(() => play(settled, { type: "hit" })).toThrow();
  });
});
