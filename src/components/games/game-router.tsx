import type { GameMetadata } from "@/modules/games/types";
import { BlackjackGame } from "./blackjack/blackjack-game";

export function GameRouter({ game }: { game: GameMetadata }) {
  return <BlackjackGame game={game} />;
}
