"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/components/session-provider";
import type { PublicBet } from "@/modules/games/types";
import { ApiError } from "@/lib/api-client";
import { formatCents, formatMultiplier } from "@/lib/money";

export function useGameResult(gameName: string) {
  const { setBalance } = useSession();
  const queryClient = useQueryClient();

  const onResult = useCallback(
    (bet: PublicBet) => {
      if (bet.balanceCents !== undefined) setBalance(bet.balanceCents);
      queryClient.invalidateQueries({ queryKey: ["history"] });
      queryClient.invalidateQueries({ queryKey: ["session"] });
      queryClient.invalidateQueries({ queryKey: ["leaderboard"] });
      if (bet.status === "settled" && bet.payoutCents > bet.amountCents && bet.multiplier >= 2.5) {
        toast.success(`${gameName} pays ${formatMultiplier(bet.multiplier)}`, {
          description: `${formatCents(bet.payoutCents)} returned to your balance.`,
        });
      }
    },
    [gameName, queryClient, setBalance],
  );

  const onError = useCallback((error: unknown) => {
    if (error instanceof ApiError) {
      toast.error("Hand not accepted", { description: error.message });
      return;
    }
    toast.error("Something went wrong", {
      description: error instanceof Error ? error.message : "Please try again.",
    });
  }, []);

  return { onResult, onError };
}
