"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowDownLeft, ArrowUpRight, Clock3, Coins, Gift, Sparkles, Wallet } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { useSession } from "@/components/session-provider";
import { useFaucetClaim } from "@/components/casino/use-faucet-claim";
import { useClock } from "@/components/casino/use-clock";
import { cn } from "@/lib/client-utils";
import { formatCents, formatSignedCents } from "@/lib/money";
import type { TransactionRow } from "@/types/api";

const typeLabels: Record<string, string> = {
  welcome: "Welcome bonus",
  faucet: "Faucet refill",
  bet: "Bet placed",
  payout: "Bet payout",
  refund: "Refund",
};

function TransactionIcon({ type }: { type: string }) {
  if (type === "payout") return <ArrowDownLeft className="size-4 text-green" />;
  if (type === "bet") return <ArrowUpRight className="size-4 text-red" />;
  if (type === "faucet") return <Gift className="size-4 text-amber" />;
  return <Sparkles className="size-4 text-blue" />;
}

export function WalletClient() {
  const { session, refresh } = useSession();
  const claim = useFaucetClaim();
  const now = useClock();
  const query = useQuery({
    queryKey: ["transactions"],
    queryFn: () => apiFetch<{ transactions: TransactionRow[] }>("/api/transactions?limit=60"),
  });
  const transactions = query.data?.transactions ?? [];
  const remaining = Math.max(0, new Date(session.faucet.nextClaimAt).getTime() - now);
  const belowTarget = session.wallet.balanceCents < session.faucet.targetCents;
  const countdown = now === 0 ? "--:--" : `${Math.floor(remaining / 60_000)}:${String(Math.floor((remaining % 60_000) / 1000)).padStart(2, "0")}`;

  return (
    <div className="space-y-5">
      <section className="surface relative overflow-hidden p-5 sm:p-7">
        <div className="absolute -right-20 -top-24 size-72 rounded-full bg-green/10 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.16em] text-green">
              <Wallet className="size-3.5" /> Your wallet
            </div>
            <h1 className="mt-2 font-display text-3xl font-bold tracking-[-0.04em] sm:text-4xl">{formatCents(session.wallet.balanceCents)}</h1>
            <p className="mt-1.5 text-xs text-muted">Play-money balance · no deposits or withdrawals</p>
            <div className="mt-5 flex flex-wrap gap-2">
              <Link href="/" className="btn btn-primary h-9 px-4 text-xs">Play games</Link>
              <button
                type="button"
                onClick={() => claim.mutate()}
                disabled={!session.faucet.available || claim.isPending}
                className="btn btn-secondary h-9 gap-2 px-4 text-xs"
              >
                {session.faucet.available ? <Gift className="size-3.5 text-amber" /> : <Clock3 className="size-3.5" />}
                {session.faucet.available ? `Claim ${formatCents(session.faucet.amountCents)}` : belowTarget ? `Faucet in ${countdown}` : "Faucet at $100+"}
              </button>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: "Wagered", value: formatCents(session.stats.wageredCents, { compact: true }) },
              { label: "Net profit", value: formatCents(session.stats.netProfitCents, { compact: true }), tone: session.stats.netProfitCents >= 0 ? "text-green" : "text-red" },
              { label: "Biggest win", value: formatCents(session.stats.biggestWinCents, { compact: true }), tone: "text-amber" },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-line/60 bg-[#0f212e]/70 p-3">
                <p className="text-[9px] uppercase tracking-wider text-muted/55">{stat.label}</p>
                <p className={cn("mt-1.5 font-display text-base font-bold", stat.tone ?? "text-white")}>{stat.value}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
          <div className="flex items-center gap-2">
            <Coins className="size-3.5 text-muted" />
            <p className="text-xs font-bold">Transaction history</p>
          </div>
          <button type="button" onClick={() => { query.refetch(); refresh(); }} className="text-[10px] font-semibold text-muted hover:text-white">
            Refresh
          </button>
        </div>
        {query.isLoading ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }, (_, index) => <div key={index} className="h-10 animate-pulse rounded bg-white/[0.04]" />)}
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-16 text-center text-xs text-muted">No transactions yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[650px] text-left">
              <thead>
                <tr className="text-[9px] uppercase tracking-wider text-muted/60">
                  <th className="px-4 py-2.5 font-semibold">Type</th>
                  <th className="px-3 py-2.5 font-semibold">Time</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Amount</th>
                  <th className="px-4 py-2.5 text-right font-semibold">Balance after</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line/35">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="text-[11px] transition hover:bg-white/[0.02]">
                    <td className="px-4 py-2.5">
                      <span className="flex items-center gap-2 font-semibold text-white">
                        <TransactionIcon type={transaction.type} />
                        {typeLabels[transaction.type] ?? transaction.type}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-[10px] text-muted/60">{new Date(transaction.createdAt).toLocaleString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}</td>
                    <td className={cn("px-3 py-2.5 text-right font-bold", transaction.amountCents >= 0 ? "text-green" : "text-red/80")}>{formatSignedCents(transaction.amountCents)}</td>
                    <td className="px-4 py-2.5 text-right text-muted">{formatCents(transaction.balanceAfterCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="surface flex flex-col items-start justify-between gap-3 p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-xs font-bold">Need a top-up?</p>
          <p className="mt-0.5 text-[10px] text-muted">The faucet restores your balance to $100 every 30 minutes when you are below the target.</p>
        </div>
        <button
          type="button"
          onClick={() => claim.mutate()}
          disabled={!session.faucet.available || claim.isPending}
          className={cn("btn h-9 px-4 text-xs", session.faucet.available ? "btn-primary" : "btn-secondary")}
        >
          {session.faucet.available ? `Claim ${formatCents(session.faucet.amountCents)}` : belowTarget ? `Ready in ${countdown}` : "Balance above $100"}
        </button>
      </section>
    </div>
  );
}
