import type { RandomSource } from "@/modules/games/types";

export const RANKS = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K"] as const;
export const SUITS = ["S", "H", "D", "C"] as const;

export type Rank = (typeof RANKS)[number];
export type Suit = (typeof SUITS)[number];

export function createDeck(decks = 1) {
  return Array.from({ length: decks }, () =>
    SUITS.flatMap((suit) => RANKS.map((rank) => `${rank}${suit}`)),
  ).flat();
}

export function shuffleDeck<T>(cards: readonly T[], random: RandomSource) {
  return random.shuffle(cards);
}

export function rankOf(card: string) {
  return card.slice(0, -1) as Rank;
}

export function suitOf(card: string) {
  return card.slice(-1) as Suit;
}

export function blackjackValue(cards: string[]) {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const rank = rankOf(card);
    if (rank === "A") {
      total += 11;
      aces += 1;
    } else if (rank === "T" || rank === "J" || rank === "Q" || rank === "K") {
      total += 10;
    } else {
      total += Number(rank);
    }
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return { total, soft: aces > 0 };
}

export function isRed(card: string) {
  const suit = suitOf(card);
  return suit === "H" || suit === "D";
}

export function pokerValue(card: string) {
  const rank = rankOf(card);
  if (rank === "A") return 14;
  if (rank === "K") return 13;
  if (rank === "Q") return 12;
  if (rank === "J") return 11;
  if (rank === "T") return 10;
  return Number(rank);
}
