"use client";

import { Radio, TrendingUp } from "lucide-react";
import { useLiveBets } from "./use-live-bets";
import { cn, avatarTone, initials } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";

export function LiveBets({ limit = 18, className }: { limit?: number; className?: string }) {
  const bets = useLiveBets(limit);
  return (
    <aside className={cn("surface flex min-h-0 flex-col overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-60" />
            <span className="relative inline-flex size-2 rounded-full bg-green" />
          </span>
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-white">Live bets</p>
        </div>
        <Radio className="size-3.5 text-muted" />
      </div>
      <div className="masked-fade max-h-[560px] flex-1 overflow-y-auto">
        {bets.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <TrendingUp className="size-5 text-muted/50" />
            <p className="text-[11px] text-muted">Waiting for the next bets…</p>
          </div>
        ) : (
          <div className="divide-y divide-line/40">
            {bets.map((bet) => (
              <div key={bet.id} className="live-row flex items-center gap-2.5 px-3.5 py-2.5">
                <span className={cn("grid size-7 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[9px] font-black", avatarTone(bet.userId))}>
                  {initials(bet.name)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-semibold text-white">{bet.name}</p>
                    <span className={cn("shrink-0 text-[10px] font-bold", bet.win ? "text-green" : "text-muted/70")}>
                      {formatMultiplier(bet.multiplier)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-[9px] text-muted">{bet.gameName}</p>
                    <p className={cn("shrink-0 text-[9px] font-semibold", bet.win ? "text-green/90" : "text-muted/60")}>
                      {bet.win ? formatCents(bet.payoutCents, { compact: true }) : formatCents(bet.amountCents, { compact: true })}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
