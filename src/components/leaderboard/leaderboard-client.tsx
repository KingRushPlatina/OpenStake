"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Crown, Medal, Star, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/components/session-provider";
import { cn, avatarTone, initials } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import type { LeaderboardResponse, LeaderboardRow } from "@/types/api";

const metrics = [
  { value: "profit", label: "Net profit" },
  { value: "biggest-win", label: "Biggest win" },
  { value: "wagered", label: "Total wagered" },
] as const;

type Metric = (typeof metrics)[number]["value"];

function Avatar({ row, size = "md" }: { row: LeaderboardRow; size?: "sm" | "md" | "lg" }) {
  return (
    <span
      className={cn(
        "grid shrink-0 place-items-center rounded-full bg-gradient-to-br font-black text-white",
        avatarTone(row.userId),
        size === "sm" && "size-7 text-[9px]",
        size === "md" && "size-9 text-[10px]",
        size === "lg" && "size-14 text-base",
        row.isCurrentUser && "ring-2 ring-green/60 ring-offset-2 ring-offset-[#0f212e]",
      )}
    >
      {initials(row.name)}
    </span>
  );
}

function podiumValue(row: LeaderboardRow, metric: Metric) {
  if (metric === "biggest-win") return formatCents(row.biggestWinCents, { compact: true });
  if (metric === "wagered") return formatCents(row.wageredCents, { compact: true });
  return formatCents(row.netProfitCents, { compact: true });
}

export function LeaderboardClient() {
  const { session } = useSession();
  const [metric, setMetric] = useState<Metric>("profit");
  const query = useQuery({
    queryKey: ["leaderboard", metric],
    queryFn: () => apiFetch<LeaderboardResponse>(`/api/leaderboard?metric=${metric}`),
  });
  const rows = query.data?.rows ?? [];
  const top = rows.slice(0, 3);
  const current = rows.find((row) => row.isCurrentUser);

  return (
    <div className="space-y-5">
      <section className="surface relative overflow-hidden p-5 sm:p-7">
        <div className="absolute -right-16 -top-20 size-56 rounded-full bg-amber/10 blur-3xl" />
        <div className="relative flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-amber">
              <Trophy className="size-3.5" /> Hall of fame
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] sm:text-4xl">Leaderboard</h1>
            <p className="mt-1.5 max-w-lg text-xs leading-5 text-muted">
              The sharpest players in OpenStake. Rankings use net profit from settled bets, not faucet refills.
            </p>
          </div>
          <div className="rounded-xl border border-line/60 bg-[#0f212e]/70 px-4 py-3 text-right">
            <p className="text-[9px] uppercase tracking-wider text-muted/60">Your rank</p>
            <p className="mt-0.5 font-display text-2xl font-bold text-white">
              {query.data?.currentRank ? `#${query.data.currentRank}` : "—"}
            </p>
            <p className={cn("text-[10px] font-semibold", session.stats.netProfitCents >= 0 ? "text-green" : "text-red")}>
              {session.stats.netProfitCents >= 0 ? "+" : ""}
              {formatCents(session.stats.netProfitCents)} net
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex rounded-lg bg-[#1a2c38] p-1">
          {metrics.map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => setMetric(item.value)}
              className={cn("tab h-8 px-3 text-[11px]", metric === item.value && "tab-active")}
            >
              {item.label}
            </button>
          ))}
        </div>
        <span className="text-[10px] text-muted">{query.isLoading ? "Loading ranks…" : `${rows.length} ranked players`}</span>
      </div>

      {top.length === 3 ? (
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[top[1], top[0], top[2]].map((row, position) => {
            const rank = position === 1 ? 1 : position === 0 ? 2 : 3;
            const heights = rank === 1 ? "sm:-mt-3" : "sm:mt-2";
            const icons = rank === 1 ? Crown : rank === 2 ? Medal : Star;
            const Icon = icons;
            return (
              <div key={row.userId} className={cn("surface relative overflow-hidden p-4 text-center", heights, rank === 1 && "border-amber/30 bg-gradient-to-b from-[#2b2c1a] to-[#1a2c38]")}>
                <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-transparent via-amber to-transparent opacity-70" />
                <div className="flex justify-center">
                  <div className="relative">
                    <Avatar row={row} size="lg" />
                    <span className={cn("absolute -right-2 -top-2 grid size-6 place-items-center rounded-full text-[9px] font-black", rank === 1 ? "bg-amber text-[#1a1200]" : "bg-[#2f4553] text-white")}>
                      <Icon className="size-3.5" />
                    </span>
                  </div>
                </div>
                <p className="mt-3 truncate text-sm font-bold">{row.name}</p>
                <p className="mt-0.5 text-[10px] text-muted">{rank === 1 ? "Champion" : rank === 2 ? "Runner-up" : "Third place"}</p>
                <p className={cn("mt-3 font-display text-xl font-bold", metric === "profit" && row.netProfitCents < 0 ? "text-red" : "text-green")}>{podiumValue(row, metric)}</p>
                <div className="mt-3 flex items-center justify-center gap-3 text-[9px] text-muted/60">
                  <span>{row.totalBets} bets</span>
                  <span className="size-0.5 rounded-full bg-muted/40" />
                  <span>{formatMultiplier(row.biggestMultiplier)} best</span>
                </div>
              </div>
            );
          })}
        </section>
      ) : null}

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
          <p className="text-xs font-bold">Top 50 players</p>
          {current ? <p className="text-[10px] text-muted">You are <strong className="text-white">#{current.rank}</strong></p> : null}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left">
            <thead>
              <tr className="text-[9px] uppercase tracking-wider text-muted/60">
                <th className="px-4 py-3 font-semibold">Rank</th>
                <th className="px-3 py-3 font-semibold">Player</th>
                <th className="px-3 py-3 text-right font-semibold">Net profit</th>
                <th className="px-3 py-3 text-right font-semibold">Wagered</th>
                <th className="px-3 py-3 text-right font-semibold">Biggest win</th>
                <th className="px-4 py-3 text-right font-semibold">Best multiplier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line/35">
              {query.isLoading
                ? Array.from({ length: 10 }, (_, index) => (
                    <tr key={index} className="animate-pulse">
                      <td colSpan={6} className="px-4 py-3"><div className="h-7 rounded bg-white/[0.04]" /></td>
                    </tr>
                  ))
                : rows.map((row) => (
                    <tr key={row.userId} className={cn("text-[11px] transition hover:bg-white/[0.02]", row.isCurrentUser && "bg-green/[0.04]")}>
                      <td className="px-4 py-2.5 font-bold text-muted">
                        <span className={cn(row.rank <= 3 && "text-amber")}>#{row.rank}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <Avatar row={row} size="sm" />
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-white">{row.name}{row.isCurrentUser ? <span className="ml-1.5 rounded bg-green/15 px-1 py-0.5 text-[8px] text-green">YOU</span> : null}</p>
                            <p className="text-[9px] text-muted/55">{row.totalBets} bets</p>
                          </div>
                        </div>
                      </td>
                      <td className={cn("px-3 py-2.5 text-right font-bold", row.netProfitCents >= 0 ? "text-green" : "text-red/80")}>{formatCents(row.netProfitCents)}</td>
                      <td className="px-3 py-2.5 text-right text-muted">{formatCents(row.wageredCents, { compact: true })}</td>
                      <td className="px-3 py-2.5 text-right text-white">{formatCents(row.biggestWinCents, { compact: true })}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-amber">{formatMultiplier(row.biggestMultiplier)}</td>
                    </tr>
                  ))}
            </tbody>
          </table>
        </div>
        {!query.isLoading && rows.length === 0 ? <div className="py-16 text-center text-xs text-muted">No players yet.</div> : null}
      </section>
    </div>
  );
}
