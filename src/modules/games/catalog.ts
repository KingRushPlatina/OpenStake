import type { GameMetadata } from "./types";

export const gameCatalog: GameMetadata[] = [
  {
    id: "blackjack",
    name: "Blackjack",
    category: "originals",
    kind: "stateful",
    tagline: "Six decks. One dealer. Your call.",
    description: "A 3:2 blackjack table with insurance, doubles and up to four hands.",
    accent: "green",
    icon: "blackjack",
    rtp: "99.5%",
    minBetCents: 10,
    maxBetCents: 50_000,
    maxWinMultiplier: 2.5,
    available: true,
  },
];

export const gameCatalogById = new Map(gameCatalog.map((game) => [game.id, game]));

export function getGameMetadata(gameId: string) {
  return gameCatalogById.get(gameId as GameMetadata["id"]);
}

export const categories = [{ id: "originals", label: "Originals" }] as const;
