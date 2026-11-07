"use client";

import { Radio } from "lucide-react";
import { useLiveBets } from "./use-live-bets";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";

export function LiveBets({ limit = 18, className }: { limit?: number; className?: string }) {
  const bets = useLiveBets(limit);
  return (
    <aside className={cn("surface overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-50" />
            <span className="relative inline-flex size-1.5 rounded-full bg-green" />
          </span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Live on the floor</p>
        </div>
        <Radio className="size-3.5 text-muted/60" />
      </div>
      <div className="masked-fade max-h-[420px] overflow-y-auto">
        {bets.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center gap-2 text-center">
            <p className="text-[11px] text-muted">Waiting for the next hand.</p>
          </div>
        ) : (
          <div className="divide-y divide-line/40">
            {bets.map((bet) => (
              <div key={bet.id} className="live-row flex items-center gap-3 px-4 py-2.5">
                <UserAvatar
                  name={bet.name}
                  userId={bet.userId}
                  avatarPreset={bet.avatarPreset}
                  avatarUrl={bet.avatarUrl}
                  size="xs"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-[11px] font-medium text-ink">{bet.name}</p>
                    <span className={cn("shrink-0 text-[10px] font-semibold tabular-nums", bet.win ? "text-green" : "text-muted/60")}>
                      {formatMultiplier(bet.multiplier)}
                    </span>
                  </div>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <p className="truncate text-[9px] text-muted/50">{bet.gameName}</p>
                    <p className={cn("shrink-0 text-[9px] tabular-nums", bet.win ? "text-green/80" : "text-muted/45")}>
                      {formatCents(bet.win ? bet.payoutCents : bet.amountCents, { compact: true })}
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
