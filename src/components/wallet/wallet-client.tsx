"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Coins, Gift, Plus, Sparkles } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/components/session-provider";
import { useFaucetClaim } from "@/components/casino/use-faucet-claim";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/client-utils";
import { formatCents, formatSignedCents } from "@/lib/money";
import type { TransactionRow } from "@/types/api";

const typeLabels: Record<string, string> = {
  welcome: "Welcome credit",
  faucet: "Instant top-up",
  bet: "Wager placed",
  payout: "Wager return",
  refund: "Refund",
};

function TransactionIcon({ type }: { type: string }) {
  if (type === "payout") return <ArrowDownLeft className="size-3.5 text-green" />;
  if (type === "bet") return <ArrowUpRight className="size-3.5 text-red/80" />;
  if (type === "faucet") return <Gift className="size-3.5 text-gold" />;
  return <Sparkles className="size-3.5 text-blue" />;
}

export function WalletClient() {
  const { session, refresh } = useSession();
  const claim = useFaucetClaim();
  const query = useQuery({
    queryKey: ["transactions"],
    queryFn: () => apiFetch<{ transactions: TransactionRow[] }>("/api/transactions?limit=60"),
  });
  const transactions = query.data?.transactions ?? [];
  const belowTarget = session.wallet.balanceCents < session.faucet.targetCents;

  return (
    <div className="space-y-8">
      <section className="grid gap-8 border-b border-line/70 pb-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-gold/50" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-gold/80">Your wallet</span>
          </div>
          <p className="mt-4 font-display text-[52px] leading-none text-ink sm:text-[64px]">{formatCents(session.wallet.balanceCents)}</p>
          <p className="mt-3 text-[12px] text-muted">Virtual credits. No deposits, withdrawals or cash value.</p>
        </div>
        <div className="grid grid-cols-3 gap-5">
          {[
            { label: "Wagered", value: formatCents(session.stats.wageredCents, { compact: true }), tone: "text-ink" },
            { label: "Net profit", value: formatCents(session.stats.netProfitCents, { compact: true }), tone: session.stats.netProfitCents >= 0 ? "text-green" : "text-red" },
            { label: "Biggest win", value: formatCents(session.stats.biggestWinCents, { compact: true }), tone: "text-gold" },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="text-[9px] uppercase tracking-[0.16em] text-muted/50">{stat.label}</p>
              <p className={cn("mt-1.5 font-display text-xl tabular-nums", stat.tone)}>{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="surface flex flex-col items-start justify-between gap-5 p-6 sm:flex-row sm:items-center">
        <div className="flex items-start gap-4">
          <span className="grid size-11 place-items-center rounded-xl border border-gold/20 bg-gold/10">
            <Gift className="size-4 text-gold" />
          </span>
          <div>
            <p className="text-[13px] font-medium text-ink">Instant top-up</p>
            <p className="mt-1 max-w-md text-[10px] leading-5 text-muted/65">
              Your minimum balance is $100. Tap add whenever you are below it and the difference is credited
              instantly.
            </p>
          </div>
        </div>
        <Button
          type="button"
          variant={belowTarget ? "primary" : "secondary"}
          size="sm"
          disabled={!belowTarget || claim.isPending}
          onClick={() => claim.mutate()}
        >
          <Plus className="size-3.5" />
          {belowTarget ? `Add ${formatCents(session.faucet.amountCents)}` : "Balance at $100"}
        </Button>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-5 py-4">
          <div className="flex items-center gap-2.5">
            <Coins className="size-3.5 text-gold/70" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Activity</p>
          </div>
          <button
            type="button"
            onClick={() => {
              query.refetch();
              refresh();
            }}
            className="text-[10px] font-medium text-muted/60 transition hover:text-ink"
          >
            Refresh
          </button>
        </div>
        {query.isLoading ? (
          <div className="space-y-2 p-5">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="h-10 animate-pulse rounded-lg bg-white/[0.025]" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-[11px] text-muted/60">No activity yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left">
              <thead>
                <tr className="text-[8px] uppercase tracking-[0.16em] text-muted/40">
                  <th className="px-5 py-3 font-medium">Type</th>
                  <th className="px-3 py-3 font-medium">Time</th>
                  <th className="px-3 py-3 text-right font-medium">Amount</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/40">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="text-[11px] transition hover:bg-white/[0.015]">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-2.5 text-ink/85">
                        <TransactionIcon type={transaction.type} />
                        {typeLabels[transaction.type] ?? transaction.type}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-[9px] text-muted/45">
                      {new Date(transaction.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className={cn("px-3 py-3 text-right font-semibold tabular-nums", transaction.amountCents >= 0 ? "text-green" : "text-red/80")}>
                      {formatSignedCents(transaction.amountCents)}
                    </td>
                    <td className="px-5 py-3 text-right text-muted tabular-nums">{formatCents(transaction.balanceAfterCents)}</td>
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
