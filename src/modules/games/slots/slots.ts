import { z } from "zod";
import type { RandomSource } from "../types";

export type SlotSymbol = {
  id: string;
  label: string;
  icon: string;
  tone: string;
};

export type SlotConfig = {
  id: "neon-fruits" | "golden-relic";
  name: string;
  wild: string;
  scatter: string;
  symbols: SlotSymbol[];
  strips: string[][];
  paytable: Record<string, [number, number, number]>;
  scatterPays: Record<number, number>;
  lines: number[][];
};

const LINES = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 0, 0, 1],
  [1, 2, 2, 2, 1],
  [0, 1, 1, 1, 0],
  [2, 1, 1, 1, 2],
  [1, 0, 1, 2, 1],
  [1, 2, 1, 0, 1],
  [0, 1, 0, 1, 0],
  [2, 1, 2, 1, 2],
  [1, 1, 0, 1, 1],
  [1, 1, 2, 1, 1],
  [0, 2, 0, 2, 0],
  [2, 0, 2, 0, 2],
  [0, 2, 2, 2, 0],
];

const NEON_SYMBOLS: SlotSymbol[] = [
  { id: "10", label: "10", icon: "ten", tone: "text-[#8fc6ff]" },
  { id: "J", label: "J", icon: "jack", tone: "text-[#8fc6ff]" },
  { id: "Q", label: "Q", icon: "queen", tone: "text-[#a879ff]" },
  { id: "K", label: "K", icon: "king", tone: "text-[#ffb800]" },
  { id: "A", label: "A", icon: "ace", tone: "text-[#ff6ea9]" },
  { id: "cherry", label: "Cherry", icon: "cherry", tone: "text-[#ff5d7a]" },
  { id: "lemon", label: "Lemon", icon: "citrus", tone: "text-[#ffe14d]" },
  { id: "bell", label: "Bell", icon: "bell", tone: "text-[#ffb800]" },
  { id: "seven", label: "Seven", icon: "seven", tone: "text-[#ff6ea9]" },
  { id: "wild", label: "Wild", icon: "star", tone: "text-[#ffffff]" },
  { id: "scatter", label: "Bonus", icon: "sparkles", tone: "text-[#00e701]" },
];

const NEON_STRIP = [
  ...Array(4).fill("10"),
  ...Array(4).fill("J"),
  ...Array(4).fill("Q"),
  ...Array(4).fill("K"),
  ...Array(4).fill("A"),
  ...Array(3).fill("cherry"),
  ...Array(3).fill("lemon"),
  ...Array(2).fill("bell"),
  ...Array(2).fill("seven"),
  "wild",
  "scatter",
];

const NEON_STRIPS = [0, 1, 2, 3, 4].map((offset) =>
  NEON_STRIP.map((_, index) => NEON_STRIP[(index * 7 + offset * 5) % NEON_STRIP.length]),
);

const NEON_PAYTABLE: Record<string, [number, number, number]> = {
  "10": [0.2, 0.6, 1.5],
  J: [0.2, 0.6, 1.5],
  Q: [0.3, 0.8, 2],
  K: [0.3, 0.8, 2],
  A: [0.4, 1, 2.5],
  cherry: [0.5, 1.5, 4],
  lemon: [0.6, 2, 5],
  bell: [0.8, 2.5, 6],
  seven: [1.2, 4, 10],
  wild: [3, 15, 80],
};

const GOLDEN_SYMBOLS: SlotSymbol[] = [
  { id: "10", label: "10", icon: "ten", tone: "text-[#d6c08a]" },
  { id: "J", label: "J", icon: "jack", tone: "text-[#d6c08a]" },
  { id: "Q", label: "Q", icon: "queen", tone: "text-[#d6c08a]" },
  { id: "K", label: "K", icon: "king", tone: "text-[#e6b54a]" },
  { id: "A", label: "A", icon: "ace", tone: "text-[#e6b54a]" },
  { id: "ankh", label: "Ankh", icon: "key", tone: "text-[#7dd3c7]" },
  { id: "scarab", label: "Scarab", icon: "gem", tone: "text-[#5ab0ff]" },
  { id: "eye", label: "Eye", icon: "eye", tone: "text-[#c6a8ff]" },
  { id: "mask", label: "Mask", icon: "crown", tone: "text-[#ffcf5a]" },
  { id: "wild", label: "Wild", icon: "flame", tone: "text-[#ff8b4d]" },
  { id: "scatter", label: "Bonus", icon: "sparkles", tone: "text-[#ffe07a]" },
];

const GOLDEN_STRIP = [
  ...Array(4).fill("10"),
  ...Array(4).fill("J"),
  ...Array(4).fill("Q"),
  ...Array(4).fill("K"),
  ...Array(4).fill("A"),
  ...Array(3).fill("ankh"),
  ...Array(2).fill("scarab"),
  ...Array(2).fill("eye"),
  ...Array(2).fill("mask"),
  "wild",
  "scatter",
];

const GOLDEN_STRIPS = [0, 1, 2, 3, 4].map((offset) =>
  GOLDEN_STRIP.map((_, index) => GOLDEN_STRIP[(index * 5 + offset * 9) % GOLDEN_STRIP.length]),
);

const GOLDEN_PAYTABLE: Record<string, [number, number, number]> = {
  "10": [0.2, 0.5, 1.2],
  J: [0.2, 0.5, 1.2],
  Q: [0.25, 0.7, 1.6],
  K: [0.3, 0.8, 1.8],
  A: [0.4, 1.1, 2.4],
  ankh: [0.6, 1.8, 4.5],
  scarab: [0.8, 2.2, 5.5],
  eye: [1, 3, 7],
  mask: [1.5, 5, 12],
  wild: [4, 20, 100],
};

function scalePaytable(table: Record<string, [number, number, number]>, factor: number) {
  return Object.fromEntries(
    Object.entries(table).map(([symbol, values]) => [
      symbol,
      values.map((value) => Math.round(value * factor * 100) / 100) as [number, number, number],
    ]),
  );
}

export const slotConfigs: Record<SlotConfig["id"], SlotConfig> = {
  "neon-fruits": {
    id: "neon-fruits",
    name: "Neon Fruits",
    wild: "wild",
    scatter: "scatter",
    symbols: NEON_SYMBOLS,
    strips: NEON_STRIPS,
    paytable: scalePaytable(NEON_PAYTABLE, 78),
    scatterPays: { 3: 2, 4: 10, 5: 50 },
    lines: LINES,
  },
  "golden-relic": {
    id: "golden-relic",
    name: "Golden Relic",
    wild: "wild",
    scatter: "scatter",
    symbols: GOLDEN_SYMBOLS,
    strips: GOLDEN_STRIPS,
    paytable: scalePaytable(GOLDEN_PAYTABLE, 72.8),
    scatterPays: { 3: 2, 4: 10, 5: 50 },
    lines: LINES,
  },
};

export const slotInputSchema = z.object({}).strict();

export type SlotLineWin = {
  line: number;
  symbol: string;
  count: number;
  multiplier: number;
  positions: number[];
};

export function playSlot(config: SlotConfig, random: RandomSource) {
  const reels = config.strips.map((strip) => {
    const stop = random.int(strip.length);
    return [0, 1, 2].map((row) => strip[(stop + row) % strip.length]);
  });

  const lineWins: SlotLineWin[] = [];
  for (const [lineIndex, line] of config.lines.entries()) {
    const symbols = line.map((row, reel) => reels[reel][row]);
    const first = symbols[0];
    if (first === config.scatter) continue;
    const base = symbols.find((symbol) => symbol !== config.wild && symbol !== config.scatter) ?? config.wild;
    let count = 0;
    while (count < 5 && (symbols[count] === base || symbols[count] === config.wild)) count += 1;
    if (count >= 3) {
      const multiplier = config.paytable[base]?.[count - 3] ?? 0;
      if (multiplier > 0) {
        lineWins.push({
          line: lineIndex,
          symbol: base,
          count,
          multiplier,
          positions: line.slice(0, count).map((row, reel) => reel * 3 + row),
        });
      }
    }
  }

  const allSymbols = reels.flat();
  const scatterCount = allSymbols.filter((symbol) => symbol === config.scatter).length;
  const scatterMultiplier = config.scatterPays[scatterCount] ?? 0;
  const lineMultiplier = lineWins.reduce((sum, win) => sum + win.multiplier, 0);
  const multiplier = lineMultiplier / config.lines.length + scatterMultiplier;

  return {
    multiplier,
    result: {
      game: config.id,
      reels,
      lineWins,
      lineMultiplier,
      scatterCount,
      scatterMultiplier,
      win: multiplier > 0,
    },
  };
}
