import { describe, expect, it } from "vitest";
import { FAUCET_TARGET_CENTS, STARTING_BALANCE_CENTS } from "@/modules/wallet/constants";

describe("top-up economy", () => {
  it("starts every seat at the $100 cap", () => {
    expect(STARTING_BALANCE_CENTS).toBe(10_000);
    expect(FAUCET_TARGET_CENTS).toBe(10_000);
  });

  it("only fills the gap below the cap", () => {
    const balances = [0, 2_500, 7_000, 9_900, 10_000, 15_000];
    const topUps = balances.map((balance) => Math.max(0, FAUCET_TARGET_CENTS - balance));
    expect(topUps).toEqual([10_000, 7_500, 3_000, 100, 0, 0]);
  });
});
