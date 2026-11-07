"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/toast-provider";
import type { PublicBet } from "@/modules/games/types";
import { ApiError } from "@/lib/api-client";
import { formatCents, formatMultiplier } from "@/lib/money";

export function useGameResult(gameId: string) {
  const { setBalance } = useSession();
  const queryClient = useQueryClient();
  const toast = useToast();

  const onResult = useCallback(
    (bet: PublicBet) => {
      if (bet.balanceCents !== undefined) setBalance(bet.balanceCents);
      queryClient.invalidateQueries({ queryKey: ["history", gameId] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      if (bet.status === "settled" && bet.payoutCents > bet.amountCents && bet.multiplier >= 4) {
        toast.success(
          `Big win · ${formatMultiplier(bet.multiplier)}`,
          `${formatCents(bet.payoutCents)} paid to your balance.`,
        );
      }
    },
    [gameId, queryClient, setBalance, toast],
  );

  const onError = useCallback(
    (error: unknown) => {
      if (error instanceof ApiError) {
        toast.error("Bet not placed", error.message);
        return;
      }
      toast.error("Something went wrong", error instanceof Error ? error.message : "Please try again.");
    },
    [toast],
  );

  return { onResult, onError };
}
