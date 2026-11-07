import type { InstantGameDefinition } from "../types";
import { diceGame } from "./dice";
import { limboGame } from "./limbo";
import { plinkoGame } from "./plinko";
import { kenoGame } from "./keno";
import { wheelGame } from "./wheel";

export const instantGames: InstantGameDefinition[] = [
  diceGame,
  limboGame,
  plinkoGame,
  kenoGame,
  wheelGame,
];

export const instantGameById = new Map(instantGames.map((game) => [game.metadata.id, game]));
