"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, Check, Pencil, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/components/session-provider";
import { useToast } from "@/components/toast-provider";
import { cn, avatarTone, initials } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import type { SessionPayload } from "@/types/api";
import type { PublicBet } from "@/modules/games/types";

export function ProfileClient() {
  const { session } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session.user.name);
  const history = useQuery({
    queryKey: ["history", "all"],
    queryFn: () => apiFetch<{ history: PublicBet[] }>("/api/history?limit=20"),
  });
  const rename = useMutation({
    mutationFn: () => apiFetch<SessionPayload>("/api/me", { method: "PATCH", body: JSON.stringify({ name }) }),
    onSuccess: (payload) => {
      queryClient.setQueryData(["session"], payload);
      setEditing(false);
      toast.success("Name updated", `You are now ${payload.user.name}.`);
    },
    onError: (error) => toast.error("Could not update name", error.message),
  });
  const bets = history.data?.history ?? [];

  return (
    <div className="space-y-5">
      <section className="surface relative overflow-hidden p-5 sm:p-7">
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-blue/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <span className={cn("grid size-16 place-items-center rounded-2xl bg-gradient-to-br text-xl font-black", avatarTone(session.user.id))}>
            {initials(session.user.name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-muted/60">Guest profile</p>
            {editing ? (
              <div className="mt-1 flex max-w-xs items-center gap-2">
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={16} className="field h-9 text-sm" autoFocus />
                <button type="button" className="btn btn-primary h-9 px-3" disabled={rename.isPending} onClick={() => rename.mutate()}><Check className="size-4" /></button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <h1 className="font-display text-2xl font-bold tracking-tight">{session.user.name}</h1>
                <button type="button" onClick={() => { setName(session.user.name); setEditing(true); }} className="rounded p-1 text-muted transition hover:bg-white/5 hover:text-white" aria-label="Edit name">
                  <Pencil className="size-3.5" />
                </button>
              </div>
            )}
            <p className="mt-1 text-[10px] text-muted">Temporary account · created {new Date(session.user.createdAt).toLocaleDateString()}</p>
          </div>
          <div className="flex gap-2">
            <Link href="/leaderboard" className="btn btn-secondary h-9 px-3 text-xs"><Trophy className="size-3.5 text-amber" /> Leaderboard</Link>
            <Link href="/fairness" className="btn btn-secondary h-9 px-3 text-xs"><ShieldCheck className="size-3.5 text-green" /> Fairness</Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Net profit", value: formatCents(session.stats.netProfitCents), tone: session.stats.netProfitCents >= 0 ? "text-green" : "text-red" },
          { label: "Total wagered", value: formatCents(session.stats.wageredCents, { compact: true }), tone: "text-white" },
          { label: "Total bets", value: session.stats.totalBets.toLocaleString(), tone: "text-white" },
          { label: "Best multiplier", value: formatMultiplier(session.stats.biggestMultiplier), tone: "text-amber" },
        ].map((stat) => (
          <div key={stat.label} className="surface p-4">
            <p className="text-[9px] uppercase tracking-wider text-muted/55">{stat.label}</p>
            <p className={cn("mt-1.5 font-display text-xl font-bold", stat.tone)}>{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-3.5 text-muted" />
            <p className="text-xs font-bold">Recent bets</p>
          </div>
          <span className="text-[9px] uppercase tracking-wider text-muted">Across all games</span>
        </div>
        {bets.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
            <Sparkles className="size-5 text-muted/40" />
            <p className="text-xs text-muted">No bets yet. <Link href="/" className="text-green hover:underline">Play a game</Link></p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px] text-left">
              <thead>
                <tr className="text-[9px] uppercase tracking-wider text-muted/60">
                  <th className="px-4 py-2.5 font-semibold">Game</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Bet</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Multiplier</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Payout</th>
                  <th className="px-4 py-2.5 text-right font-semibold">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/35">
                {bets.map((bet) => (
                  <tr key={bet.id} className="text-[11px] transition hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5 font-semibold capitalize text-white">{bet.gameId.replaceAll("-", " ")}</td>
                    <td className="px-3 py-2.5 text-right text-muted">{formatCents(bet.amountCents)}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-white">{formatMultiplier(bet.multiplier)}</td>
                    <td className={cn("px-3 py-2.5 text-right font-bold", bet.payoutCents > bet.amountCents ? "text-green" : bet.payoutCents > 0 ? "text-white" : "text-muted/50")}>{formatCents(bet.payoutCents)}</td>
                    <td className="px-4 py-2.5 text-right text-[10px] text-muted/60">{new Date(bet.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
