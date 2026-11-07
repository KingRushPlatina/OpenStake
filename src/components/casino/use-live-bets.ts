"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { LiveBet } from "@/types/api";

function merge(primary: LiveBet[], secondary: LiveBet[], limit: number) {
  const seen = new Set<string>();
  const combined: LiveBet[] = [];
  for (const bet of [...primary, ...secondary]) {
    if (seen.has(bet.id)) continue;
    seen.add(bet.id);
    combined.push(bet);
  }
  combined.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime());
  return combined.slice(0, limit);
}

export function useLiveBets(limit = 40) {
  const [bets, setBets] = useState<LiveBet[]>([]);

  useEffect(() => {
    let cancelled = false;
    const source = new EventSource("/api/stream");
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as { type?: string } & Partial<LiveBet>;
        if (payload.type !== "live-bet" || !payload.id) return;
        const bet = payload as LiveBet;
        setBets((current) => (current.some((entry) => entry.id === bet.id) ? current : merge([bet], current, limit)));
      } catch {
        return;
      }
    };

    apiFetch<{ bets: LiveBet[] }>(`/api/feed?limit=${limit}`)
      .then((payload) => {
        if (cancelled) return;
        setBets((current) => merge(current, payload.bets, limit));
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      source.close();
    };
  }, [limit]);

  return bets;
}
