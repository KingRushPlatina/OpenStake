"use client";

import { useEffect, useState } from "react";
import type { LiveBet } from "@/types/api";

export function useLiveBets(limit = 40) {
  const [bets, setBets] = useState<LiveBet[]>([]);

  useEffect(() => {
    const source = new EventSource("/api/stream");
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string } & Partial<LiveBet>;
        if (payload.type !== "live-bet" || !payload.id) return;
        const bet = payload as LiveBet;
        setBets((current) => {
          if (current.some((entry) => entry.id === bet.id)) return current;
          return [bet, ...current].slice(0, limit);
        });
      } catch {
        return;
      }
    };
    return () => source.close();
  }, [limit]);

  return bets;
}
