"use client";

import { useQuery } from "@tanstack/react-query";
import { Crown, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/components/session-provider";
import { UserAvatar } from "@/components/user-avatar";
import { cn } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import type { LeaderboardResponse, LeaderboardRow } from "@/types/api";

function Avatar({ row, size = "md" }: { row: LeaderboardRow; size?: "sm" | "md" | "lg" }) {
  return (
    <UserAvatar
      name={row.name}
      userId={row.userId}
      avatarPreset={row.avatarPreset}
      avatarUrl={row.avatarUrl}
      size={size}
      className={cn(row.isCurrentUser && "ring-1 ring-gold/60 ring-offset-2 ring-offset-bg")}
    />
  );
}

export function LeaderboardClient() {
  const { session } = useSession();
  const query = useQuery({
    queryKey: ["leaderboard", "profit"],
    queryFn: () => apiFetch<LeaderboardResponse>("/api/leaderboard?metric=profit"),
  });
  const rows = query.data?.rows ?? [];
  const top = rows.slice(0, 3);
  const current = rows.find((row) => row.isCurrentUser);

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 border-b border-line/70 pb-8 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-gold/50" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-gold/80">The board</span>
          </div>
          <h1 className="mt-4 text-4xl text-ink sm:text-5xl">Leaderboard</h1>
          <p className="mt-3 max-w-xl text-[12px] leading-5 text-muted">
            The sharpest seats at the table. Rankings use settled originals rounds only; faucet refills and bonuses do
            not count toward profit.
          </p>
        </div>
        <div className="grid grid-cols-3 gap-6 md:text-right">
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted/50">Your rank</p>
            <p className="mt-1 font-display text-2xl text-ink">{query.data?.currentRank ? `#${query.data.currentRank}` : "—"}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted/50">Net</p>
            <p className={cn("mt-1 font-display text-2xl", session.stats.netProfitCents >= 0 ? "text-green" : "text-red")}>
              {session.stats.netProfitCents >= 0 ? "+" : ""}
              {formatCents(session.stats.netProfitCents, { compact: true })}
            </p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted/50">Rounds</p>
            <p className="mt-1 font-display text-2xl text-ink">{session.stats.totalBets.toLocaleString()}</p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="rounded-full border border-gold/25 bg-gold/[0.06] px-3 py-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-gold">
          Ranked by net profit
        </span>
        <span className="text-[10px] text-muted/50">{query.isLoading ? "Reading the board…" : `${rows.length} ranked seats`}</span>
      </div>

      {top.length === 3 ? (
        <section className="grid gap-4 md:grid-cols-3">
          {[top[1], top[0], top[2]].map((row, position) => {
            const rank = position === 1 ? 1 : position === 0 ? 2 : 3;
            return (
              <div
                key={row.userId}
                className={cn(
                  "surface relative overflow-hidden p-5",
                  rank === 1 && "order-1 border-gold/25 bg-[linear-gradient(180deg,rgba(216,184,120,0.06),transparent)] md:order-2",
                  rank === 2 && "order-2 md:order-1",
                  rank === 3 && "order-3",
                )}
              >
                <div className="flex items-start justify-between">
                  <span className={cn("font-display text-3xl", rank === 1 ? "text-gold" : "text-muted/35")}>0{rank}</span>
                  {rank === 1 ? <Crown className="size-4 text-gold" /> : <span className="text-[9px] uppercase tracking-[0.2em] text-muted/35">Seat</span>}
                </div>
                <div className="mt-5 flex items-center gap-3">
                  <Avatar row={row} size="lg" />
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-ink">{row.name}</p>
                    <p className="mt-0.5 text-[9px] text-muted/50">{row.totalBets} rounds · {formatMultiplier(row.biggestMultiplier)} best</p>
                  </div>
                </div>
                <p className={cn("mt-5 font-display text-2xl tabular-nums", row.netProfitCents < 0 ? "text-red/80" : "text-green")}>
                  {row.netProfitCents >= 0 ? "+" : ""}
                  {formatCents(row.netProfitCents)}
                </p>
                <p className="mt-1 text-[9px] uppercase tracking-[0.16em] text-muted/45">Net profit</p>
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Trophy className="size-3.5 text-gold/70" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Top 50 seats</p>
          </div>
          {current ? <p className="text-[10px] text-muted/55">You are <span className="text-ink">#{current.rank}</span></p> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="text-[8px] uppercase tracking-[0.16em] text-muted/40">
                <th className="px-5 py-3 font-medium">Rank</th>
                <th className="px-3 py-3 font-medium">Player</th>
                <th className="px-3 py-3 text-right font-medium">Net profit</th>
                <th className="px-3 py-3 text-right font-medium">Wagered</th>
                <th className="px-3 py-3 text-right font-medium">Biggest win</th>
                <th className="px-5 py-3 text-right font-medium">Best round</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/40">
              {query.isLoading
                ? Array.from({ length: 10 }, (_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td colSpan={6} className="px-5 py-3"><div className="h-7 rounded bg-white/[0.03]" /></td>
                    </tr>
                  ))
                : rows.map((row) => (
                    <tr key={row.userId} className={cn("text-[11px] transition hover:bg-white/[0.015]", row.isCurrentUser && "bg-gold/[0.035]")}>
                      <td className="px-5 py-3">
                        <span className={cn("tabular-nums", row.rank <= 3 ? "text-gold" : "text-muted/55")}>{String(row.rank).padStart(2, "0")}</span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-2.5">
                          <Avatar row={row} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-medium text-ink">
                              {row.name}
                              {row.isCurrentUser ? <span className="ml-2 rounded bg-gold/15 px-1.5 py-0.5 text-[8px] text-gold">YOU</span> : null}
                            </p>
                            <p className="text-[9px] text-muted/40">{row.totalBets} rounds</p>
                          </div>
                        </div>
                      </td>
                      <td className={cn("px-3 py-3 text-right font-semibold tabular-nums", row.netProfitCents >= 0 ? "text-green" : "text-red/80")}>
                        {row.netProfitCents >= 0 ? "+" : ""}
                        {formatCents(row.netProfitCents)}
                      </td>
                      <td className="px-3 py-3 text-right text-muted tabular-nums">{formatCents(row.wageredCents, { compact: true })}</td>
                      <td className="px-3 py-3 text-right text-ink/80 tabular-nums">{formatCents(row.biggestWinCents, { compact: true })}</td>
                      <td className="px-5 py-3 text-right font-medium text-gold tabular-nums">{formatMultiplier(row.biggestMultiplier)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!query.isLoading && rows.length === 0 ? <div className="py-16 text-center text-[11px] text-muted/60">No seats ranked yet.</div> : null}
      </section>
    </div>
  );
}
