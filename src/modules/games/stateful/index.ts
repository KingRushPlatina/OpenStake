import type { ProgressionEngine } from "./types";
import { blackjackGame } from "./blackjack";

export const progressionGames: ProgressionEngine[] = [blackjackGame];

export const progressionGameById = new Map(progressionGames.map((game) => [game.metadata.id, game]));
