import type { ProgressionEngine } from "./types";
import { blackjackGame } from "./blackjack";
import { minesGame } from "./mines";
import { hiloGame } from "./hilo";
import { dragonTowerGame } from "./dragon-tower";
import { chickenCrossGame } from "./chicken-cross";
import { limboGame } from "./limbo";

export const progressionGames: ProgressionEngine[] = [
  blackjackGame,
  minesGame,
  hiloGame,
  dragonTowerGame,
  chickenCrossGame,
  limboGame,
];

export const progressionGameById = new Map(progressionGames.map((game) => [game.metadata.id, game]));
