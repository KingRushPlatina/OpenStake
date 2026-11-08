import { describe, expect, it } from "vitest";
import { blackjackGame } from "@/modules/games/stateful/blackjack";
import { minesGame } from "@/modules/games/stateful/mines";
import { hiloGame } from "@/modules/games/stateful/hilo";
import { dragonTowerGame } from "@/modules/games/stateful/dragon-tower";
import { chickenCrossGame } from "@/modules/games/stateful/chicken-cross";
import { limboGame } from "@/modules/games/stateful/limbo";
import { diceGame } from "@/modules/games/instant/dice";
import { plinkoGame } from "@/modules/games/instant/plinko";
import { kenoGame } from "@/modules/games/instant/keno";
import { getKenoPaytable } from "@/modules/games/paytables/keno";
import { getWheelMultipliers, wheelGame } from "@/modules/games/instant/wheel";
import { limboCrashDelayMs } from "@/lib/limbo";
import { rouletteGame, resolveRouletteStake } from "@/modules/games/instant/roulette";
import { ROULETTE_WHEEL, ROULETTE_SPOTS, rouletteColor } from "@/lib/roulette";
import { blackjackValue, createDeck, rankOf, suitOf } from "@/modules/games/cards";
import type { RandomSource } from "@/modules/games/types";
import { progressionPayoutCents, type ProgressionSnapshot } from "@/modules/games/stateful/types";
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

function startWith(firstCards: string[], betCents = 100, input: unknown = {}) {
  return blackjackGame.start(input, { betCents, random: new ScriptedRandom(deckWith(firstCards)) });
}

function settledResult(snapshot: ProgressionSnapshot) {
  return snapshot.settledResult as unknown as SettledState;
}

function liveState(snapshot: ProgressionSnapshot) {
  return snapshot.publicState as unknown as BlackjackState;
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
    expect(liveState(start).phase).toBe("insurance");
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

  it("stakes the sum of the chips across four betting boxes", () => {
    expect(blackjackGame.resolveStake?.({ spots: [100, 500, 2_500, 100_000] }, 0)).toBe(103_100);
    const start = startWith(["10S", "9H", "8D", "8C", "9S", "7H", "6S"], 600, { spots: [100, 500] });
    const state = liveState(start);
    expect(state.hands).toHaveLength(2);
    expect(state.hands[0]?.betCents).toBe(100);
    expect(state.hands[1]?.betCents).toBe(500);
    expect(state.totalStake).toBe(600);
  });

  it("plays and settles multiple boxes in one round", () => {
    const start = startWith(["10S", "9H", "8D", "8C", "9S", "7H", "6S"], 600, { spots: [100, 500] });
    const second = play(start, { type: "stand" });
    expect(liveState(second).activeHand).toBe(1);
    const settled = play(second, { type: "stand" });
    expect(settled.status).toBe("settled");
    expect(settled.multiplier).toBe(2);
    expect(settled.payoutCents).toBe(1_200);
    expect(settledResult(settled).totalPayout).toBe(1_200);
    expect(settledResult(settled).payouts).toHaveLength(2);
  });

  it("keeps the active box when a hit does not finish the hand", () => {
    const start = startWith(["10S", "6H", "8D", "8C", "9S", "7H", "2S"], 600, { spots: [100, 500] });
    expect(liveState(start).activeHand).toBe(0);
    const hit = play(start, { type: "hit" });
    const state = liveState(hit);
    expect(state.activeHand).toBe(0);
    expect(state.hands[0]?.status).toBe("active");
    expect(state.hands[0]?.total).toBe(18);
    const next = play(hit, { type: "stand" });
    expect(liveState(next).activeHand).toBe(1);
  });

  it("does not cap how many chips a box can carry", () => {
    expect(blackjackGame.resolveStake?.({ spots: [5_000_000] }, 0)).toBe(5_000_000);
  });

  it("stands a natural in one box and keeps playing the others", () => {
    const start = startWith(["AS", "KH", "10D", "9C", "9S", "7H", "6S"], 600, { spots: [100, 500] });
    expect(start.status).toBe("active");
    const state = liveState(start);
    expect(state.hands[0]?.status).toBe("stood");
    expect(state.hands[1]?.status).toBe("active");
    expect(state.activeHand).toBe(1);
    const settled = play(start, { type: "stand" });
    expect(settled.status).toBe("settled");
    expect(settled.multiplier).toBeCloseTo(1_250 / 600);
    expect(settledResult(settled).payouts[0]?.outcome).toBe("blackjack");
  });

  it("offers insurance on the whole table and pays it on a dealer blackjack", () => {
    const start = startWith(["KH", "QS", "9D", "8C", "AD", "KC"], 300, { spots: [100, 200] });
    expect(liveState(start).phase).toBe("insurance");
    const insured = play(start, { type: "take-insurance" });
    expect(insured.status).toBe("settled");
    expect(insured.additionalStakeCents).toBe(150);
    expect(insured.multiplier).toBe(1);
    expect(settledResult(insured).insurancePayout).toBe(450);
  });

  it("rejects more than four betting boxes", () => {
    expect(() =>
      startWith(["10S", "9H", "9D", "7C"], 500, { spots: [100, 100, 100, 100, 100] }),
    ).toThrow();
  });
});

class StaticRandom implements RandomSource {
  constructor(
    private readonly nextValue: number,
    private readonly shuffleSource: unknown[] = [],
  ) {}
  next() {
    return this.nextValue;
  }
  int() {
    return 0;
  }
  pick<T>(items: readonly T[]) {
    return items[0];
  }
  shuffle<T>(items: readonly T[]) {
    return (this.shuffleSource.length > 0 ? this.shuffleSource : items) as T[];
  }
}

class QueueRandom implements RandomSource {
  constructor(private readonly queue: unknown[][]) {}
  next() {
    return 0.1;
  }
  int() {
    return 0;
  }
  pick<T>(items: readonly T[]) {
    return items[0];
  }
  shuffle<T>() {
    return (this.queue.shift() ?? []) as T[];
  }
}

class IndexRandom implements RandomSource {
  constructor(private readonly index: number) {}
  next() {
    return 0.5;
  }
  int() {
    return this.index;
  }
  pick<T>(items: readonly T[]) {
    return items[0];
  }
  shuffle<T>(items: readonly T[]) {
    return items as T[];
  }
}

function spinTo(number: number) {
  return new IndexRandom(ROULETTE_WHEEL.indexOf(number as (typeof ROULETTE_WHEEL)[number]));
}

describe("instant originals", () => {
  it("rolls dice under a threshold and pays the chance multiplier", () => {
    const outcome = diceGame.play({ direction: "under", chance: 49.5 }, new StaticRandom(0.25));
    expect(outcome.result).toMatchObject({ roll: 25, direction: "under", win: true });
    expect(outcome.multiplier).toBeCloseTo(2);
  });

  it("drops a plinko ball into the matching bucket", () => {
    const outcome = plinkoGame.play({ rows: 8, risk: "low" }, new StaticRandom(0.1));
    expect(outcome.result).toMatchObject({ rows: 8, bucket: 0 });
    expect(outcome.multiplier).toBe(5.6);
  });

  it("matches keno picks against a drawn board", () => {
    const deck = Array.from({ length: 40 }, (_, index) => index + 1);
    const outcome = kenoGame.play({ picks: [1, 2, 3], risk: "medium" }, new StaticRandom(0.5, deck));
    expect(outcome.result).toMatchObject({ hitCount: 3 });
    expect(outcome.multiplier).toBe(getKenoPaytable(3, "medium")[3]);
  });

  it("lands the wheel on the generated segment", () => {
    const multipliers = getWheelMultipliers(10, "low");
    const outcome = wheelGame.play({ segments: 10, risk: "low" }, new StaticRandom(0.5));
    expect(outcome.result).toMatchObject({ index: 0, segments: 10 });
    expect(outcome.multiplier).toBe(multipliers[0]);
  });

  it("builds a complete single-zero European wheel and felt", () => {
    expect(ROULETTE_WHEEL).toHaveLength(37);
    expect(new Set(ROULETTE_WHEEL).size).toBe(37);
    expect(rouletteColor(0)).toBe("green");
    expect(rouletteColor(32)).toBe("red");
    expect(rouletteColor(26)).toBe("black");
    expect(ROULETTE_SPOTS.length).toBeGreaterThan(150);
    expect(ROULETTE_SPOTS.find((spot) => spot.id === "split-1-2")?.returnMultiplier).toBe(18);
    expect(ROULETTE_SPOTS.find((spot) => spot.id === "corner-1-2-4-5")?.returnMultiplier).toBe(9);
  });

  it("pays a straight roulette number at thirty-five to one", () => {
    const outcome = rouletteGame.play(
      { bets: [{ kind: "straight", numbers: [17], amountCents: 100 }] },
      spinTo(17),
    );
    expect(outcome.result).toMatchObject({
      number: 17,
      color: "black",
      totalStakeCents: 100,
      totalPayoutCents: 3_600,
    });
    expect(outcome.multiplier).toBe(36);
    expect(rouletteGame.resolvePayout?.(100, outcome)).toBe(3_600);
  });

  it("loses a straight bet when the ball lands elsewhere", () => {
    const outcome = rouletteGame.play(
      { bets: [{ kind: "straight", numbers: [17], amountCents: 100 }] },
      spinTo(18),
    );
    expect(outcome.result).toMatchObject({ totalPayoutCents: 0 });
    expect(outcome.multiplier).toBe(0);
    expect(rouletteGame.resolvePayout?.(100, outcome)).toBe(0);
  });

  it("settles inside and outside roulette bets together", () => {
    const outcome = rouletteGame.play(
      {
        bets: [
          { kind: "straight", numbers: [16], amountCents: 100 },
          { kind: "red", amountCents: 100 },
          { kind: "column", group: 1, amountCents: 100 },
        ],
      },
      spinTo(16),
    );
    expect(outcome.result).toMatchObject({
      totalStakeCents: 300,
      totalPayoutCents: 4_100,
    });
    expect(outcome.multiplier).toBeCloseTo(4_100 / 300, 4);
    expect((outcome.result.wins as unknown[]).length).toBe(3);
  });

  it("pays splits, streets, corners and six lines on the matching number", () => {
    const cases = [
      { kind: "split", numbers: [1, 2], number: 2, multiplier: 18 },
      { kind: "street", numbers: [1, 2, 3], number: 3, multiplier: 12 },
      { kind: "corner", numbers: [1, 2, 4, 5], number: 5, multiplier: 9 },
      { kind: "sixline", numbers: [1, 2, 3, 4, 5, 6], number: 6, multiplier: 6 },
      { kind: "street", numbers: [0, 1, 2], number: 0, multiplier: 12 },
    ] as const;
    for (const entry of cases) {
      const outcome = rouletteGame.play(
        { bets: [{ kind: entry.kind, numbers: [...entry.numbers], amountCents: 100 }] },
        spinTo(entry.number),
      );
      expect(outcome.multiplier).toBe(entry.multiplier);
    }
  });

  it("resolves the roulette stake as the sum of every chip on the felt", () => {
    const input = {
      bets: [
        { kind: "straight" as const, numbers: [8], amountCents: 500 },
        { kind: "dozen" as const, group: 1, amountCents: 2_500 },
        { kind: "black" as const, amountCents: 100 },
      ],
    };
    expect(resolveRouletteStake(input)).toBe(3_100);
    const outcome = rouletteGame.play(input, spinTo(8));
    expect(outcome.result).toMatchObject({ totalStakeCents: 3_100 });
    expect(rouletteGame.resolvePayout?.(3_100, outcome)).toBe(500 * 36 + 2_500 * 3 + 100 * 2);
  });

  it("rejects a bet that does not exist on the table", () => {
    expect(() =>
      rouletteGame.play(
        { bets: [{ kind: "split", numbers: [1, 3], amountCents: 100 }] },
        spinTo(1),
      ),
    ).toThrow();
    expect(() =>
      rouletteGame.play(
        { bets: [{ kind: "column", group: 4, amountCents: 100 }] },
        spinTo(1),
      ),
    ).toThrow();
  });
});

describe("stateful originals", () => {
  it("reveals mines safely and cashes out at the current multiplier", () => {
    const board = Array.from({ length: 25 }, (_, index) => index);
    const start = minesGame.start({ mines: 3 }, { betCents: 100, random: new StaticRandom(0.5, board) });
    expect(start.status).toBe("active");
    expect((start.publicState as { multiplier: number }).multiplier).toBe(1);
    const revealed = minesGame.act(start, { type: "reveal", tile: 5 });
    expect(revealed.status).toBe("active");
    const cashed = minesGame.act(revealed, { type: "cashout" });
    expect(cashed.status).toBe("settled");
    expect(cashed.multiplier).toBeGreaterThan(1);
    expect((cashed.settledResult as { lost: boolean }).lost).toBe(false);
  });

  it("ends the mines round when a mine is revealed", () => {
    const board = Array.from({ length: 25 }, (_, index) => index);
    const start = minesGame.start({ mines: 3 }, { betCents: 100, random: new StaticRandom(0.5, board) });
    const lost = minesGame.act(start, { type: "reveal", tile: 0 });
    expect(lost.status).toBe("settled");
    expect(lost.multiplier).toBe(0);
    expect((lost.settledResult as { lost: boolean }).lost).toBe(true);
  });

  it("builds a hilo multiplier on a winning call and cashes out", () => {
    const shoe = ["5S", "9H", "2D", "KD", "3C"];
    const start = hiloGame.start({}, { betCents: 100, random: new StaticRandom(0.5, shoe) });
    expect(start.status).toBe("active");
    const won = hiloGame.act(start, { type: "higher" });
    expect(won.status).toBe("active");
    expect(won.multiplier).toBeGreaterThan(1);
    const cashed = hiloGame.act(won, { type: "cashout" });
    expect(cashed.status).toBe("settled");
    expect(cashed.multiplier).toBeGreaterThan(1);
  });

  it("settles a hilo loss when the call is wrong", () => {
    const shoe = ["5S", "9H", "2D", "9D"];
    const start = hiloGame.start({}, { betCents: 100, random: new StaticRandom(0.5, shoe) });
    const lost = hiloGame.act(start, { type: "lower" });
    expect(lost.status).toBe("settled");
    expect(lost.multiplier).toBe(0);
    expect((lost.settledResult as { lost: boolean }).lost).toBe(true);
  });

  it("climbs a dragon tower floor and cashes out", () => {
    const rows = Array.from({ length: 9 }, () => [0, 2, 1]);
    const start = dragonTowerGame.start({ difficulty: "easy" }, { betCents: 100, random: new QueueRandom(rows) });
    expect(start.status).toBe("active");
    const climbed = dragonTowerGame.act(start, { type: "pick", tile: 1 });
    expect(climbed.status).toBe("active");
    expect(climbed.multiplier).toBeGreaterThan(1);
    const cashed = dragonTowerGame.act(climbed, { type: "cashout" });
    expect(cashed.status).toBe("settled");
    expect(cashed.multiplier).toBeGreaterThan(1);
  });

  it("ends the dragon tower climb on a dragon", () => {
    const rows = Array.from({ length: 9 }, () => [0, 2, 1]);
    const start = dragonTowerGame.start({ difficulty: "easy" }, { betCents: 100, random: new QueueRandom(rows) });
    const lost = dragonTowerGame.act(start, { type: "pick", tile: 0 });
    expect(lost.status).toBe("settled");
    expect(lost.multiplier).toBe(0);
    expect((lost.settledResult as { lost: boolean }).lost).toBe(true);
  });

  it("crosses a safe lane and cashes out the chicken run", () => {
    const start = chickenCrossGame.start({ difficulty: "medium" }, { betCents: 100, random: new StaticRandom(0.1) });
    expect(start.status).toBe("active");
    const crossed = chickenCrossGame.act(start, { type: "cross" });
    expect(crossed.status).toBe("active");
    expect(crossed.multiplier).toBeGreaterThan(1);
    const cashed = chickenCrossGame.act(crossed, { type: "cashout" });
    expect(cashed.status).toBe("settled");
  });

  it("stops the chicken run when traffic is hit", () => {
    const start = chickenCrossGame.start({ difficulty: "medium" }, { betCents: 100, random: new StaticRandom(0.9) });
    const lost = chickenCrossGame.act(start, { type: "cross" });
    expect(lost.status).toBe("settled");
    expect(lost.multiplier).toBe(0);
    expect((lost.settledResult as { lost: boolean }).lost).toBe(true);
  });

  it("flies limbo and cashes out below the crash point", () => {
    const start = limboGame.start({}, { betCents: 100, random: new StaticRandom(0.5), nowMs: 1_000 });
    expect(start.status).toBe("active");
    expect((start.publicState as { crash?: number }).crash).toBeUndefined();
    const cashed = limboGame.act(start, { type: "cashout" }, { nowMs: 5_000 });
    expect(cashed.status).toBe("settled");
    expect(cashed.multiplier).toBe(1.41);
    expect((cashed.settledResult as { crash: number; lost: boolean }).crash).toBe(1.98);
    expect((cashed.settledResult as { crash: number; lost: boolean }).lost).toBe(false);
  });

  it("crashes limbo when the cashout lands after the draw", () => {
    const start = limboGame.start({}, { betCents: 100, random: new StaticRandom(0.5), nowMs: 1_000 });
    const late = limboGame.act(start, { type: "cashout" }, { nowMs: 9_000 });
    expect(late.status).toBe("settled");
    expect(late.multiplier).toBe(0);
    const result = late.settledResult as { crash: number; lost: boolean };
    expect(result.crash).toBe(1.98);
    expect(result.lost).toBe(true);
  });

  it("expires limbo rounds on the server clock", () => {
    const start = limboGame.start({}, { betCents: 100, random: new StaticRandom(0.5), nowMs: 1_000 });
    const crashAt = 1_000 + limboCrashDelayMs(1.98);
    expect(limboGame.checkExpired?.(start, { nowMs: crashAt - 1 })).toBeNull();
    const expired = limboGame.checkExpired?.(start, { nowMs: crashAt });
    expect(expired?.status).toBe("settled");
    expect(expired?.multiplier).toBe(0);
    expect((expired?.settledResult as { lost: boolean }).lost).toBe(true);
  });

  it("crashes limbo instantly on a 1.00x draw", () => {
    const start = limboGame.start({}, { betCents: 100, random: new StaticRandom(0.005), nowMs: 1_000 });
    expect(start.status).toBe("settled");
    expect(start.multiplier).toBe(0);
    expect((start.settledResult as { crash: number; lost: boolean }).crash).toBe(1);
    expect((start.settledResult as { crash: number; lost: boolean }).lost).toBe(true);
  });

  it("pays progression cashouts from the multiplier instead of the max win cap", () => {
    expect(progressionPayoutCents(100, 3.1288, undefined, 1_000_000)).toBe(312);
    expect(progressionPayoutCents(100, 3.1288, 500, 1_000_000)).toBe(500);
    expect(progressionPayoutCents(100, 0, undefined, 1_000_000)).toBe(0);
    expect(progressionPayoutCents(100, 3.1288, undefined, 2)).toBe(200);
  });
});
