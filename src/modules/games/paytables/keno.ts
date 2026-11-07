import { getKenoPaytable as resolvePaytable, type KenoRisk as Risk } from "../instant/keno";

export const getKenoPaytable = resolvePaytable;
export type KenoRisk = Risk;

export function kenoRtp(picks: number, risk: KenoRisk) {
  const table = getKenoPaytable(picks, risk);
  const combinations = (n: number, k: number) => {
    if (k < 0 || k > n) return 0;
    let result = 1;
    for (let index = 1; index <= k; index += 1) result = (result * (n - k + index)) / index;
    return Math.round(result);
  };
  const probabilities = Array.from({ length: picks + 1 }, (_, hits) => {
    return (
      (combinations(picks, hits) * combinations(40 - picks, 10 - hits)) /
      combinations(40, 10)
    );
  });
  return table.reduce<number>((sum, value, hits) => sum + value * probabilities[hits], 0);
}
