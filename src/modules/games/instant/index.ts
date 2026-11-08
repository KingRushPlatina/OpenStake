import type { InstantGameDefinition } from "../types";
import { diceGame } from "./dice";
import { plinkoGame } from "./plinko";
import { kenoGame } from "./keno";
import { wheelGame } from "./wheel";
import { rouletteGame } from "./roulette";

export const instantGames: InstantGameDefinition[] = [
  diceGame,
  plinkoGame,
  kenoGame,
  wheelGame,
  rouletteGame,
];

export const instantGameById = new Map(instantGames.map((game) => [game.metadata.id, game]));
