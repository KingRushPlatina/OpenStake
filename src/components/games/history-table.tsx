"use client";

import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { getGameMetadata } from "@/modules/games/catalog";
import type { PublicBet } from "@/modules/games/types";
import { cn } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";

export function HistoryTable({ gameId }: { gameId: string }) {
  const query = useQuery({
    queryKey: ["history", gameId],
    queryFn: () => apiFetch<{ history: PublicBet[] }>(`/api/history?game=${gameId}&limit=12`),
  });
  const history = query.data?.history ?? [];

  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <History className="size-3.5 text-gold/70" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Recent rounds</p>
        </div>
        <span className="text-[9px] uppercase tracking-[0.14em] text-muted/40">
          {history.length === 1 ? "1 round" : `${history.length} rounds`}
        </span>
      </div>
      {history.length === 0 ? (
        <div className="flex h-28 items-center justify-center text-[11px] text-muted/55">Your rounds will appear here.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="text-[8px] uppercase tracking-[0.16em] text-muted/40">
                <th className="px-5 py-3 font-medium">Game</th>
                <th className="px-3 py-3 text-right font-medium">Stake</th>
                <th className="px-3 py-3 text-right font-medium">Return</th>
                <th className="px-3 py-3 text-right font-medium">Multiplier</th>
                <th className="px-5 py-3 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {history.map((bet) => {
                const profit = bet.payoutCents - bet.amountCents;
                const name = getGameMetadata(bet.gameId)?.name ?? bet.gameId;
                const active = bet.status === "active";
                return (
                  <tr key={bet.id} className="text-[11px] transition hover:bg-white/[0.015]">
                    <td className="px-5 py-3 font-medium text-ink">
                      {name}
                      {active ? <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[8px] font-semibold uppercase tracking-[0.08em] text-gold">Live</span> : null}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted">{formatCents(bet.amountCents)}</td>
                    <td
                      className={cn(
                        "px-3 py-3 text-right font-semibold tabular-nums",
                        active ? "text-gold/70" : profit > 0 ? "text-green" : profit === 0 ? "text-ink" : "text-muted/55",
                      )}
                    >
                      {active ? "In play" : formatCents(bet.payoutCents)}
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums text-muted/70">{formatMultiplier(bet.multiplier)}</td>
                    <td className="px-5 py-3 text-right text-[9px] text-muted/45">
                      {new Date(bet.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
