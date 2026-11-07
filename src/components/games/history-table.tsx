"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownRight, ArrowUpRight, History } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { PublicBet } from "@/modules/games/types";
import { cn } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";

export function HistoryTable({ gameId }: { gameId: string }) {
  const query = useQuery({
    queryKey: ["history", gameId],
    queryFn: () => apiFetch<{ history: PublicBet[] }>(`/api/history?game=${gameId}&limit=14`),
  });
  const history = query.data?.history ?? [];

  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <History className="size-3.5 text-muted" />
          <p className="text-xs font-bold">My bets</p>
        </div>
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted">Last {history.length}</span>
      </div>
      {history.length === 0 ? (
        <div className="flex h-28 items-center justify-center text-[11px] text-muted">Your bets will appear here.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider text-muted/65">
                <th className="px-4 py-2.5 font-semibold">Game</th>
                <th className="px-3 py-2.5 text-right font-semibold">Bet</th>
                <th className="px-3 py-2.5 text-right font-semibold">Multiplier</th>
                <th className="px-3 py-2.5 text-right font-semibold">Payout</th>
                <th className="px-4 py-2.5 text-right font-semibold">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/35">
              {history.map((bet) => {
                const win = bet.payoutCents > bet.amountCents;
                return (
                  <tr key={bet.id} className="text-[11px] transition hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-1.5 font-semibold capitalize text-muted">
                        {win ? <ArrowUpRight className="size-3 text-green" /> : <ArrowDownRight className="size-3 text-red/70" />}
                        {bet.gameId.replaceAll("-", " ")}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right text-balance text-muted">{formatCents(bet.amountCents)}</td>
                    <td className={cn("px-3 py-2.5 text-right font-semibold", bet.multiplier > 0 ? "text-white" : "text-muted/50")}>
                      {formatMultiplier(bet.multiplier)}
                    </td>
                    <td className={cn("px-3 py-2.5 text-right font-bold", win ? "text-green" : bet.payoutCents > 0 ? "text-white" : "text-muted/50")}>
                      {formatCents(bet.payoutCents)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-[10px] text-muted/60">
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
