export const ROULETTE_MIN_BET_CENTS = 10;

/** Single-zero European wheel, clockwise from zero. */
export const ROULETTE_WHEEL = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22,
  18, 29, 7, 28, 12, 35, 3, 26,
] as const;

export const ROULETTE_RED_NUMBERS = [
  1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36,
] as const;

const redSet = new Set<number>(ROULETTE_RED_NUMBERS);

export type RouletteColor = "red" | "black" | "green";

export function rouletteColor(number: number): RouletteColor {
  if (number === 0) return "green";
  return redSet.has(number) ? "red" : "black";
}

export type RouletteBetKind =
  | "straight"
  | "split"
  | "street"
  | "corner"
  | "sixline"
  | "column"
  | "dozen"
  | "red"
  | "black"
  | "odd"
  | "even"
  | "low"
  | "high";

export type RouletteBet = {
  kind: RouletteBetKind;
  amountCents: number;
  numbers?: number[];
  group?: number;
};

export type RouletteSpot = {
  id: string;
  kind: RouletteBetKind;
  numbers?: number[];
  group?: number;
  label: string;
  /** Total returned per unit staked, including the original stake. */
  returnMultiplier: number;
};

export type RouletteWin = RouletteBet & {
  payoutCents: number;
  returnMultiplier: number;
  label: string;
};

export type RouletteSettlement = {
  totalStakeCents: number;
  totalPayoutCents: number;
  multiplier: number;
  wins: RouletteWin[];
};

export type RouletteResult = RouletteSettlement & {
  number: number;
  color: RouletteColor;
  wheelIndex: number;
  bets: RouletteBet[];
};

export const ROULETTE_RETURNS: Record<RouletteBetKind, number> = {
  straight: 36,
  split: 18,
  street: 12,
  corner: 9,
  sixline: 6,
  column: 3,
  dozen: 3,
  red: 2,
  black: 2,
  odd: 2,
  even: 2,
  low: 2,
  high: 2,
};

function range(start: number, end: number): number[] {
  return Array.from({ length: end - start + 1 }, (_, index) => start + index);
}

export function coveredNumbers(bet: Pick<RouletteBet, "kind" | "numbers" | "group">): number[] {
  switch (bet.kind) {
    case "column": {
      const column = bet.group ?? 1;
      return Array.from({ length: 12 }, (_, index) => column + index * 3);
    }
    case "dozen": {
      const dozen = bet.group ?? 1;
      return range((dozen - 1) * 12 + 1, dozen * 12);
    }
    case "red":
      return [...ROULETTE_RED_NUMBERS];
    case "black":
      return range(1, 36).filter((number) => !redSet.has(number));
    case "odd":
      return range(1, 36).filter((number) => number % 2 === 1);
    case "even":
      return range(1, 36).filter((number) => number % 2 === 0);
    case "low":
      return range(1, 18);
    case "high":
      return range(19, 36);
    default:
      return bet.numbers ?? [];
  }
}

export function rouletteBetWins(bet: Pick<RouletteBet, "kind" | "numbers" | "group">, number: number) {
  return coveredNumbers(bet).includes(number);
}

function betLabel(kind: RouletteBetKind, numbers?: number[], group?: number) {
  switch (kind) {
    case "straight":
      return `Straight ${numbers?.[0]}`;
    case "split":
      return `Split ${numbers?.join("/")}`;
    case "street":
      return `Street ${numbers?.[0]}-${numbers?.[numbers.length - 1]}`;
    case "corner":
      return `Corner ${numbers?.join("/")}`;
    case "sixline":
      return `Six line ${numbers?.[0]}-${numbers?.[numbers.length - 1]}`;
    case "column":
      return `Column ${group}`;
    case "dozen":
      return `${["1st", "2nd", "3rd"][(group ?? 1) - 1]} dozen`;
    case "red":
      return "Red";
    case "black":
      return "Black";
    case "odd":
      return "Odd";
    case "even":
      return "Even";
    case "low":
      return "1 to 18";
    case "high":
      return "19 to 36";
    default:
      return kind;
  }
}

function sortedSignature(numbers: number[]) {
  return [...numbers].sort((a, b) => a - b).join("-");
}

function createSpot(kind: RouletteBetKind, numbers?: number[], group?: number): RouletteSpot {
  const id =
    kind === "column" || kind === "dozen"
      ? `${kind}-${group}`
      : `${kind}-${sortedSignature(numbers ?? [])}`;
  return {
    id,
    kind,
    numbers,
    group,
    label: betLabel(kind, numbers, group),
    returnMultiplier: ROULETTE_RETURNS[kind],
  };
}

function createSpots(): RouletteSpot[] {
  const spots: RouletteSpot[] = [];

  for (let number = 0; number <= 36; number += 1) {
    spots.push(createSpot("straight", [number]));
  }

  // Splits: horizontal neighbours (n, n+3), vertical neighbours (n, n+1) and zero neighbours.
  for (let number = 1; number <= 36; number += 1) {
    if (number + 3 <= 36) spots.push(createSpot("split", [number, number + 3]));
    if (number % 3 !== 0) spots.push(createSpot("split", [number, number + 1]));
  }
  for (const number of [1, 2, 3]) spots.push(createSpot("split", [0, number]));

  // Streets: three-number columns, plus the two zero trios.
  for (let number = 1; number <= 34; number += 3) {
    spots.push(createSpot("street", [number, number + 1, number + 2]));
  }
  spots.push(createSpot("street", [0, 1, 2]));
  spots.push(createSpot("street", [0, 2, 3]));

  // Corners: four-number squares.
  for (let number = 1; number + 4 <= 36; number += 1) {
    if (number % 3 === 0) continue;
    spots.push(createSpot("corner", [number, number + 1, number + 3, number + 4]));
  }

  // Six lines: two adjacent streets.
  for (let number = 1; number + 5 <= 36; number += 3) {
    spots.push(createSpot("sixline", range(number, number + 5)));
  }

  for (const group of [1, 2, 3]) {
    spots.push(createSpot("column", undefined, group));
    spots.push(createSpot("dozen", undefined, group));
  }

  for (const kind of ["red", "black", "odd", "even", "low", "high"] as const) {
    spots.push(createSpot(kind));
  }

  return spots;
}

export const ROULETTE_SPOTS = createSpots();
export const ROULETTE_SPOT_BY_ID = new Map(ROULETTE_SPOTS.map((spot) => [spot.id, spot]));

const signaturesByKind = new Map<RouletteBetKind, Set<string>>();
for (const spot of ROULETTE_SPOTS) {
  if (!spot.numbers) continue;
  let set = signaturesByKind.get(spot.kind);
  if (!set) {
    set = new Set<string>();
    signaturesByKind.set(spot.kind, set);
  }
  set.add(sortedSignature(spot.numbers));
}

export function isValidRouletteBet(bet: Pick<RouletteBet, "kind" | "numbers" | "group">) {
  if (bet.kind === "column" || bet.kind === "dozen") {
    return bet.group === 1 || bet.group === 2 || bet.group === 3;
  }
  if (bet.kind === "red" || bet.kind === "black" || bet.kind === "odd" || bet.kind === "even" || bet.kind === "low" || bet.kind === "high") {
    return true;
  }
  if (!bet.numbers || bet.numbers.length === 0) return false;
  if (bet.numbers.some((number) => !Number.isInteger(number) || number < 0 || number > 36)) return false;
  return signaturesByKind.get(bet.kind)?.has(sortedSignature(bet.numbers)) ?? false;
}

export function settleRouletteBets(bets: RouletteBet[], number: number): RouletteSettlement {
  let totalStakeCents = 0;
  let totalPayoutCents = 0;
  const wins: RouletteWin[] = [];

  for (const bet of bets) {
    totalStakeCents += bet.amountCents;
    if (!rouletteBetWins(bet, number)) continue;
    const returnMultiplier = ROULETTE_RETURNS[bet.kind];
    const payoutCents = bet.amountCents * returnMultiplier;
    totalPayoutCents += payoutCents;
    wins.push({
      ...bet,
      payoutCents,
      returnMultiplier,
      label: betLabel(bet.kind, bet.numbers, bet.group),
    });
  }

  const multiplier =
    totalStakeCents > 0 ? Math.round((totalPayoutCents / totalStakeCents) * 10_000) / 10_000 : 0;

  return { totalStakeCents, totalPayoutCents, multiplier, wins };
}

/** Spot ids on the felt, grouped by kind for layout rendering. */
export const ROULETTE_SPOTS_BY_KIND = ROULETTE_SPOTS.reduce<Record<string, RouletteSpot[]>>(
  (groups, spot) => {
    (groups[spot.kind] ??= []).push(spot);
    return groups;
  },
  {},
);
