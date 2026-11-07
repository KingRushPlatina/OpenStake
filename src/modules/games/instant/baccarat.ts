import { z } from "zod";
import type { InstantGameDefinition, RandomSource } from "../types";
import { gameCatalogById } from "../catalog";
import { baccaratValue, createDeck, shuffleDeck } from "../cards";

const amount = z.number().int().min(0);

export const baccaratInputSchema = z
  .object({
    player: amount,
    banker: amount,
    tie: amount,
  })
  .refine((bets) => bets.player + bets.banker + bets.tie > 0, { message: "Place at least one bet" });

function handTotal(cards: string[]) {
  return cards.reduce((sum, card) => sum + baccaratValue(card), 0) % 10;
}

export const baccaratGame: InstantGameDefinition = {
  metadata: gameCatalogById.get("baccarat")!,
  inputSchema: baccaratInputSchema,
  resolveAmount: (input) => {
    const parsed = baccaratInputSchema.parse(input);
    return parsed.player + parsed.banker + parsed.tie;
  },
  play: (input, random: RandomSource) => {
    const bets = baccaratInputSchema.parse(input);
    const totalBet = bets.player + bets.banker + bets.tie;
    const shoe = shuffleDeck(createDeck(8), random);
    let cursor = 0;
    const draw = () => shoe[cursor++];
    const player = [draw(), draw()];
    const banker = [draw(), draw()];
    let playerTotal = handTotal(player);
    let bankerTotal = handTotal(banker);
    let playerThird: string | null = null;
    let bankerThird: string | null = null;

    if (playerTotal < 8 && bankerTotal < 8) {
      if (playerTotal <= 5) {
        playerThird = draw();
        player.push(playerThird);
        playerTotal = handTotal(player);
      }
      const playerThirdValue = playerThird ? baccaratValue(playerThird) : null;
      const bankerDraws =
        playerThirdValue === null
          ? bankerTotal <= 5
          : bankerTotal <= 2 ||
            (bankerTotal === 3 && playerThirdValue !== 8) ||
            (bankerTotal === 4 && playerThirdValue >= 2 && playerThirdValue <= 7) ||
            (bankerTotal === 5 && playerThirdValue >= 4 && playerThirdValue <= 7) ||
            (bankerTotal === 6 && (playerThirdValue === 6 || playerThirdValue === 7));
      if (bankerDraws) {
        bankerThird = draw();
        banker.push(bankerThird);
        bankerTotal = handTotal(banker);
      }
    }

    const winner = playerTotal === bankerTotal ? "tie" : playerTotal > bankerTotal ? "player" : "banker";
    let totalPayout = 0;
    if (winner === "tie") {
      totalPayout += bets.player + bets.banker + bets.tie * 9;
    } else if (winner === "player") {
      totalPayout += bets.player * 2;
    } else {
      totalPayout += Math.floor(bets.banker * 1.95);
    }

    return {
      multiplier: totalPayout / totalBet,
      result: {
        player,
        banker,
        playerTotal,
        bankerTotal,
        playerThird,
        bankerThird,
        winner,
        bets,
        totalBet,
        totalPayout,
      },
    };
  },
};
