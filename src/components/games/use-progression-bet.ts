"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { PublicBet } from "@/modules/games/types";

export function useProgressionBet(gameId: string) {
  const [activeBet, setActiveBet] = useState<PublicBet | null>(null);
  const [serverNowMs, setServerNowMs] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ active: PublicBet | null; serverNowMs?: number }>(`/api/games/${gameId}/active`)
      .then((payload) => {
        if (cancelled) return;
        if (payload.active) setActiveBet(payload.active);
        if (typeof payload.serverNowMs === "number") setServerNowMs(payload.serverNowMs);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  return { activeBet, setActiveBet, serverNowMs, setServerNowMs };
}
