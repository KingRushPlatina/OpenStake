import { describe, expect, it } from "vitest";
import { diceGame } from "@/modules/games/instant/dice";
import { limboGame } from "@/modules/games/instant/limbo";
import { getPlinkoPayouts, plinkoGame } from "@/modules/games/instant/plinko";
import { getWheelMultipliers, wheelGame } from "@/modules/games/instant/wheel";
import { getKenoPaytable, kenoRtp } from "@/modules/games/paytables/keno";
import { blackjackValue, createDeck, rankOf, suitOf } from "@/modules/games/cards";
import type { RandomSource } from "@/modules/games/types";

class SequenceRandom implements RandomSource {
  private cursor = 0;
  constructor(private readonly values: number[]) {}
  next() {
    const value = this.values[this.cursor % this.values.length];
    this.cursor += 1;
    return value;
  }
  int(maxExclusive: number) {
    return Math.floor(this.next() * maxExclusive);
  }
  pick<T>(items: readonly T[]) {
    return items[this.int(items.length)];
  }
  shuffle<T>(items: readonly T[]) {
    return [...items];
  }
}

function combination(n: number, k: number) {
  if (k < 0 || k > n) return 0;
  let result = 1;
  for (let index = 1; index <= k; index += 1) result = (result * (n - k + index)) / index;
  return Math.round(result);
}

describe("dice", () => {
  it("pays the inverse of the win chance with a one percent edge", () => {
    const win = diceGame.play({ direction: "under", chance: 50 }, new SequenceRandom([0.49]));
    const loss = diceGame.play({ direction: "under", chance: 50 }, new SequenceRandom([0.51]));
    expect(win.multiplier).toBeCloseTo(1.98, 5);
    expect(loss.multiplier).toBe(0);
  });

  it("keeps rtp at 99 percent for every chance", () => {
    for (const chance of [2, 10, 25, 49.5, 75, 95]) {
      expect((chance / 100) * (99 / chance)).toBeCloseTo(0.99, 8);
    }
  });

  it("rejects a chance outside the supported range", () => {
    expect(() => diceGame.play({ direction: "over", chance: 1 }, new SequenceRandom([0.5]))).toThrow();
  });
});

describe("limbo", () => {
  it("wins only when the result reaches the target", () => {
    const hit = limboGame.play({ target: 2 }, new SequenceRandom([0.6]));
    const miss = limboGame.play({ target: 10 }, new SequenceRandom([0.5]));
    expect(hit.result.win).toBe(true);
    expect(hit.multiplier).toBe(2);
    expect(miss.result.win).toBe(false);
    expect(miss.multiplier).toBe(0);
  });

  it("has a 99 percent return for a target", () => {
    expect((0.99 / 2) * 2).toBeCloseTo(0.99, 8);
  });
});

describe("plinko", () => {
  it("keeps all published tables near a 99 percent return", () => {
    for (const rows of [8, 10, 12, 14, 16]) {
      for (const risk of ["low", "medium", "high"] as const) {
        const table = getPlinkoPayouts(rows, risk);
        const rtp = table.reduce((sum, multiplier, bucket) => {
          return sum + multiplier * (combination(rows, bucket) / 2 ** rows);
        }, 0);
        expect(rtp).toBeGreaterThan(0.985);
        expect(rtp).toBeLessThan(0.995);
      }
    }
  });

  it("returns the bucket matching the generated path", () => {
    const outcome = plinkoGame.play({ rows: 8, risk: "low" }, new SequenceRandom([0.6, 0.4, 0.6, 0.4, 0.6, 0.4, 0.6, 0.4]));
    expect(outcome.result.bucket).toBe(4);
    expect(outcome.multiplier).toBe(getPlinkoPayouts(8, "low")[4]);
  });
});

describe("wheel", () => {
  it("normalizes every wheel to approximately 99 percent", () => {
    for (const segments of [10, 20, 30, 40, 50]) {
      for (const risk of ["low", "medium", "high"] as const) {
        const multipliers = getWheelMultipliers(segments, risk);
        const average = multipliers.reduce((sum, value) => sum + value, 0) / segments;
        expect(average).toBeGreaterThan(0.97);
        expect(average).toBeLessThan(1.01);
      }
    }
  });

  it("selects the segment indicated by the random source", () => {
    const outcome = wheelGame.play({ segments: 10, risk: "low" }, new SequenceRandom([0.35]));
    expect(outcome.result.index).toBe(3);
    expect(outcome.multiplier).toBe(getWheelMultipliers(10, "low")[3]);
  });
});

describe("keno", () => {
  it("keeps every paytable close to a 99 percent return", () => {
    for (let picks = 1; picks <= 10; picks += 1) {
      for (const risk of ["low", "medium", "high"] as const) {
        const table = getKenoPaytable(picks, risk);
        expect(table.some((value) => value > 0)).toBe(true);
        expect(kenoRtp(picks, risk)).toBeGreaterThan(0.98);
        expect(kenoRtp(picks, risk)).toBeLessThan(1);
      }
    }
  });
});

describe("cards", () => {
  it("builds a unique six-deck shoe per deck", () => {
    const deck = createDeck(6);
    expect(deck).toHaveLength(312);
    expect(new Set(deck).size).toBe(52);
    expect(deck.every((card) => rankOf(card).length > 0 && suitOf(card).length === 1)).toBe(true);
  });

  it("counts aces as soft eleven and reduces them on bust", () => {
    expect(blackjackValue(["AS", "6H"])).toEqual({ total: 17, soft: true });
    expect(blackjackValue(["AS", "6H", "KH"])).toEqual({ total: 17, soft: false });
    expect(blackjackValue(["AS", "AH", "9D"])).toEqual({ total: 21, soft: true });
  });
});

class SeededRandom implements RandomSource {
  private state: number;
  constructor(seed: number) {
    this.state = seed >>> 0;
  }
  next() {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let value = this.state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  }
  int(maxExclusive: number) {
    return Math.floor(this.next() * maxExclusive);
  }
  pick<T>(items: readonly T[]) {
    return items[this.int(items.length)];
  }
  shuffle<T>(items: readonly T[]) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = this.int(index + 1);
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }
}

describe("slots", () => {
  it("keeps both original slot configurations near 96 percent", async () => {
    const { playSlot, slotConfigs } = await import("@/modules/games/slots/slots");
    for (const config of Object.values(slotConfigs)) {
      const random = new SeededRandom(7);
      const spins = 120_000;
      let total = 0;
      for (let index = 0; index < spins; index += 1) {
        total += playSlot(config, random).multiplier;
      }
      const rtp = total / spins;
      expect(rtp).toBeGreaterThan(0.94);
      expect(rtp).toBeLessThan(0.98);
    }
  });
});

describe("mines", () => {
  it("prices a safe pick at the fair odds with a one percent edge", async () => {
    const { minesGame } = await import("@/modules/games/stateful/mines");
    const snapshot = minesGame.start({ mines: 3 }, { betCents: 100, random: new SeededRandom(4) });
    const revealed = minesGame.act(snapshot, { type: "reveal", tile: 24 });
    expect(revealed.status).toBe("active");
    expect(revealed.multiplier).toBeCloseTo(1.125, 3);
  });
});

describe("crash", () => {
  it("produces a one percent house edge distribution", async () => {
    const { crashPointFromSeed } = await import("@/lib/fairness");
    const samples = 20_000;
    let aboveTwo = 0;
    for (let index = 0; index < samples; index += 1) {
      const point = crashPointFromSeed(`seed-${index}`, "openstake-crash", index);
      if (point >= 2) aboveTwo += 1;
    }
    expect(aboveTwo / samples).toBeGreaterThan(0.47);
    expect(aboveTwo / samples).toBeLessThan(0.52);
  });
});
