"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { PublicBet } from "@/modules/games/types";

export function useProgressionBet(gameId: string) {
  const [activeBet, setActiveBet] = useState<PublicBet | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ active: PublicBet | null }>(`/api/games/${gameId}/active`)
      .then((payload) => {
        if (!cancelled && payload.active) setActiveBet(payload.active);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  return { activeBet, setActiveBet };
}
