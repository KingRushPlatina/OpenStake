"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Pencil, ShieldCheck, Trophy } from "lucide-react";
import { toast } from "sonner";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { cn, avatarTone, initials } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import type { SessionPayload } from "@/types/api";
import type { PublicBet } from "@/modules/games/types";

export function ProfileClient() {
  const { session } = useSession();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(session.user.name);
  const history = useQuery({
    queryKey: ["history", "profile"],
    queryFn: () => apiFetch<{ history: PublicBet[] }>("/api/history?limit=20"),
  });
  const rename = useMutation({
    mutationFn: () => apiFetch<SessionPayload>("/api/me", { method: "PATCH", body: JSON.stringify({ name }) }),
    onSuccess: (payload) => {
      queryClient.setQueryData(["session"], payload);
      setEditing(false);
      toast.success("Seat name updated", { description: `You are now ${payload.user.name}.` });
    },
    onError: (error) => toast.error("Could not update name", { description: error.message }),
  });
  const bets = history.data?.history ?? [];

  return (
    <div className="space-y-8">
      <section className="flex flex-col gap-6 border-b border-line/70 pb-8 md:flex-row md:items-end md:justify-between">
        <div className="flex items-center gap-4">
          <span className={cn("grid size-16 place-items-center rounded-2xl border border-white/5 bg-gradient-to-br font-display text-xl text-white/90", avatarTone(session.user.id))}>
            {initials(session.user.name)}
          </span>
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/70">Temporary seat</p>
            {editing ? (
              <div className="mt-2 flex max-w-xs items-center gap-2">
                <input value={name} onChange={(event) => setName(event.target.value)} maxLength={16} className="field h-10 text-sm" autoFocus />
                <Button type="button" size="icon" disabled={rename.isPending} onClick={() => rename.mutate()}>
                  <Check className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="mt-1 flex items-center gap-2">
                <h1 className="text-3xl text-ink sm:text-4xl">{session.user.name}</h1>
                <button
                  type="button"
                  onClick={() => {
                    setName(session.user.name);
                    setEditing(true);
                  }}
                  className="rounded-lg p-1.5 text-muted/50 transition hover:bg-surface-2 hover:text-ink"
                  aria-label="Edit name"
                >
                  <Pencil className="size-3.5" />
                </button>
              </div>
            )}
            <p className="mt-1.5 text-[10px] text-muted/50">Created {new Date(session.user.createdAt).toLocaleDateString()} · no signup required</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button asChild variant="secondary" size="sm">
            <Link href="/leaderboard"><Trophy className="size-3.5 text-gold" /> Leaderboard</Link>
          </Button>
          <Button asChild variant="secondary" size="sm">
            <Link href="/fairness"><ShieldCheck className="size-3.5 text-green" /> Fairness</Link>
          </Button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { label: "Net profit", value: formatCents(session.stats.netProfitCents), tone: session.stats.netProfitCents >= 0 ? "text-green" : "text-red" },
          { label: "Total wagered", value: formatCents(session.stats.wageredCents, { compact: true }), tone: "text-ink" },
          { label: "Hands played", value: session.stats.totalBets.toLocaleString(), tone: "text-ink" },
          { label: "Best return", value: formatMultiplier(session.stats.biggestMultiplier), tone: "text-gold" },
        ].map((stat) => (
          <div key={stat.label} className="border-l border-line/70 pl-4">
            <p className="text-[9px] uppercase tracking-[0.16em] text-muted/50">{stat.label}</p>
            <p className={cn("mt-2 font-display text-2xl tabular-nums", stat.tone)}>{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Recent hands</p>
          <span className="text-[9px] uppercase tracking-[0.14em] text-muted/45">Across the table</span>
        </div>
        {bets.length === 0 ? (
          <div className="flex h-36 flex-col items-center justify-center gap-3">
            <p className="text-[11px] text-muted/60">No hands yet.</p>
            <Button asChild size="sm" variant="secondary">
              <Link href="/casino/blackjack">Take a seat</Link>
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[580px] text-left">
              <thead>
                <tr className="text-[8px] uppercase tracking-[0.16em] text-muted/40">
                  <th className="px-5 py-3 font-medium">Hand</th>
                  <th className="px-3 py-3 text-right font-medium">Stake</th>
                  <th className="px-3 py-3 text-right font-medium">Return</th>
                  <th className="px-3 py-3 text-right font-medium">Multiplier</th>
                  <th className="px-5 py-3 text-right font-medium">When</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {bets.map((bet) => {
                  const profit = bet.payoutCents - bet.amountCents;
                  return (
                    <tr key={bet.id} className="text-[11px] transition hover:bg-white/[0.015]">
                      <td className="px-5 py-3 font-medium text-ink">Blackjack</td>
                      <td className="px-3 py-3 text-right text-muted tabular-nums">{formatCents(bet.amountCents)}</td>
                      <td className={cn("px-3 py-3 text-right font-semibold tabular-nums", profit > 0 ? "text-green" : profit === 0 ? "text-ink" : "text-muted/60")}>
                        {formatCents(bet.payoutCents)}
                      </td>
                      <td className="px-3 py-3 text-right text-muted tabular-nums">{formatMultiplier(bet.multiplier)}</td>
                      <td className="px-5 py-3 text-right text-[9px] text-muted/45">
                        {new Date(bet.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
