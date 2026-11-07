import type { ProgressionEngine } from "./types";
import { minesGame } from "./mines";
import { dragonTowerGame } from "./dragon-tower";
import { chickenCrossGame } from "./chicken-cross";
import { hiloGame } from "./hilo";
import { videoPokerGame } from "./video-poker";
import { blackjackGame } from "./blackjack";

export const progressionGames: ProgressionEngine[] = [
  minesGame,
  dragonTowerGame,
  chickenCrossGame,
  hiloGame,
  videoPokerGame,
  blackjackGame,
];

export const progressionGameById = new Map(progressionGames.map((game) => [game.metadata.id, game]));
