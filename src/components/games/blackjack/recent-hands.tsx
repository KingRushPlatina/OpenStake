"use client";

import { useQuery } from "@tanstack/react-query";
import { History } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import type { PublicBet } from "@/modules/games/types";
import { cn } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";

function outcome(bet: PublicBet) {
  if (bet.status === "active") return { label: "Live", tone: "text-gold" };
  const profit = bet.payoutCents - bet.amountCents;
  if (profit > 0) return { label: "Win", tone: "text-green" };
  if (profit === 0) return { label: "Push", tone: "text-ink" };
  return { label: "Loss", tone: "text-red/80" };
}

export function RecentHands() {
  const query = useQuery({
    queryKey: ["history", "blackjack", "table"],
    queryFn: () => apiFetch<{ history: PublicBet[] }>("/api/history?game=blackjack&limit=8"),
  });
  const hands = query.data?.history ?? [];

  return (
    <section className="surface overflow-hidden">
      <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
        <div className="flex items-center gap-2.5">
          <History className="size-3.5 text-gold/70" />
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Session log</p>
        </div>
        <span className="text-[9px] uppercase tracking-[0.14em] text-muted/45">{hands.length === 1 ? "1 hand" : `${hands.length} hands`}</span>
      </div>
      {hands.length === 0 ? (
        <div className="flex h-32 items-center justify-center text-[11px] text-muted/60">Your hands will appear here.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="text-[8px] uppercase tracking-[0.16em] text-muted/40">
                <th className="px-5 py-3 font-medium">Hand</th>
                <th className="px-3 py-3 text-right font-medium">Stake</th>
                <th className="px-3 py-3 text-right font-medium">Result</th>
                <th className="px-3 py-3 text-right font-medium">Return</th>
                <th className="px-5 py-3 text-right font-medium">Time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {hands.map((bet) => {
                const state = outcome(bet);
                const profit = bet.payoutCents - bet.amountCents;
                return (
                  <tr key={bet.id} className="text-[11px] transition hover:bg-white/[0.015]">
                    <td className="px-5 py-3">
                      <span className="font-medium text-ink">Blackjack</span>
                      <span className="ml-2 text-[9px] text-muted/40">#{bet.id.slice(-4).toUpperCase()}</span>
                    </td>
                    <td className="px-3 py-3 text-right text-muted tabular-nums">{formatCents(bet.amountCents)}</td>
                    <td className={cn("px-3 py-3 text-right font-semibold", state.tone)}>
                      {state.label}
                      {bet.payoutCents > bet.amountCents ? <span className="ml-1.5 text-[9px] font-normal text-muted/50">{formatMultiplier(bet.multiplier)}</span> : null}
                    </td>
                    <td className={cn("px-3 py-3 text-right font-semibold tabular-nums", profit > 0 ? "text-green" : profit === 0 ? "text-ink" : "text-muted/60")}>
                      {profit > 0 ? `+${formatCents(profit)}` : formatCents(bet.payoutCents)}
                    </td>
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
