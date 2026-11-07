"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, ArrowUpRight, Check, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { apiFetch } from "@/lib/api-client";
import { gameCatalog } from "@/modules/games/catalog";
import { useSession } from "@/components/session-provider";
import { UserAvatar } from "@/components/user-avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { GameTile } from "@/components/casino/game-tile";
import { LiveBets } from "@/components/casino/live-bets";
import { TopUpNotice } from "@/components/casino/top-up-notice";
import { TablePreview } from "@/components/casino/table-preview";
import { cn } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import type { LeaderboardResponse } from "@/types/api";

const rules = [
  { label: "Blackjack", value: "Pays 3:2" },
  { label: "Dealer", value: "Stands on soft 17" },
  { label: "Doubles", value: "Any two cards" },
  { label: "Splits", value: "Up to four hands" },
  { label: "Insurance", value: "Pays 2:1" },
  { label: "Shoe", value: "Six decks" },
];

export function LobbyClient() {
  const { session } = useSession();
  const leaderboard = useQuery({
    queryKey: ["leaderboard", "profit", "preview"],
    queryFn: () => apiFetch<LeaderboardResponse>("/api/leaderboard?metric=profit"),
  });
  const top = leaderboard.data?.rows.slice(0, 5) ?? [];

  return (
    <div className="space-y-14">
      <section className="grid items-center gap-10 pt-4 lg:grid-cols-[1.02fr_0.98fr] lg:gap-14 lg:pt-8">
        <div>
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-gold/50" />
            <span className="text-[10px] font-semibold uppercase tracking-[0.26em] text-gold/80">OpenStake Originals · The floor</span>
          </div>
          <h1 className="mt-6 max-w-xl text-[42px] leading-[1.02] text-ink sm:text-[60px] lg:text-[64px]">
            A better seat
            <span className="block italic text-gold/90">at every table.</span>
          </h1>
          <p className="mt-5 max-w-lg text-[13px] leading-6 text-muted sm:text-sm">
            Ten original games, one committed seed. Dice, Plinko, Mines, Keno, Limbo, Wheel, HiLo, Dragon Tower,
            Chicken Cross and Blackjack — all play money, all verifiable.
          </p>
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Button asChild size="lg">
              <Link href="#games">
                Explore the floor <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button asChild variant="secondary" size="lg">
              <Link href="/casino/blackjack">Play Blackjack</Link>
            </Button>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-[11px] text-muted">
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-green" /> {formatCents(session.wallet.balanceCents)} available
            </span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-gold" /> 10 originals
            </span>
            <span className="flex items-center gap-2">
              <span className="size-1.5 rounded-full bg-muted/50" /> No real money
            </span>
          </div>
        </div>
        <TablePreview />
      </section>

      <TopUpNotice minBetCents={Math.min(...gameCatalog.map((game) => game.minBetCents))} />

      <section id="games" className="scroll-mt-24">
        <div className="flex flex-wrap items-end justify-between gap-4 border-b border-line/70 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <span className="h-px w-7 bg-gold/50" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/80">The floor</p>
            </div>
            <h2 className="mt-3 text-3xl text-ink">Ten originals, dealt clean.</h2>
            <p className="mt-2 max-w-xl text-[11px] leading-5 text-muted/65">
              Instant games and table classics, settled server-side against a committed seed.
            </p>
          </div>
          <span className="text-[10px] text-muted/45">{gameCatalog.length} games · 99%+ RTP</span>
        </div>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {gameCatalog.map((game) => (
            <GameTile key={game.id} game={game} />
          ))}
        </div>
      </section>

      <section className="surface overflow-hidden">
        <div className="grid lg:grid-cols-[1.35fr_1fr]">
          <div className="border-b border-line/70 p-6 sm:p-8 lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-3">
              <span className="grid size-11 place-items-center rounded-xl border border-gold/20 bg-gold/10 font-display text-xl text-gold">B</span>
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/60">The flagship table</p>
                <h2 className="mt-0.5 text-2xl text-ink">Blackjack</h2>
              </div>
            </div>
            <p className="mt-5 max-w-xl text-[12px] leading-6 text-muted">
              A focused single-table blackjack room. Hit, stand, double, split and insure with server-side settlement
              and a full round history. The shoe is shuffled per round and every result is reproducible.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              <Badge tone="gold">Originals</Badge>
              <Badge>3:2 payout</Badge>
              <Badge>6-deck shoe</Badge>
              <Badge>99.5% RTP</Badge>
            </div>
            <div className="mt-7">
              <Button asChild>
                <Link href="/casino/blackjack">
                  Enter the table <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
          </div>
          <div className="grid grid-cols-2 divide-x divide-y divide-line/70 border-line/70 [&>*]:p-5 sm:[&>*]:p-6">
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/60">Limits</p>
              <p className="mt-2 font-display text-xl text-ink">$0.10 — $500</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/60">Max return</p>
              <p className="mt-2 font-display text-xl text-ink">2.50x</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/60">Settlement</p>
              <p className="mt-2 font-display text-xl text-ink">Instant</p>
            </div>
            <div>
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/60">Fairness</p>
              <p className="mt-2 font-display text-xl text-ink">HMAC-SHA256</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid items-start gap-5 lg:grid-cols-[1fr_1fr]">
        <LiveBets limit={10} />
        <div className="surface overflow-hidden">
          <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
            <div className="flex items-center gap-2">
              <Trophy className="size-3.5 text-gold" />
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted">Floor leaders</p>
            </div>
            <Link href="/leaderboard" className="text-[10px] font-medium text-muted transition hover:text-ink">
              Full board <ArrowUpRight className="inline size-3" />
            </Link>
          </div>
          <div className="divide-y divide-line/40">
            {leaderboard.isLoading ? (
              Array.from({ length: 5 }, (_, index) => (
                <div key={index} className="flex h-[52px] animate-pulse items-center px-4">
                  <div className="h-4 w-full rounded bg-white/[0.03]" />
                </div>
              ))
            ) : top.length === 0 ? (
              <div className="flex h-[220px] flex-col items-center justify-center gap-1 px-4 text-center">
                <p className="text-[11px] text-muted">No rounds on the board yet.</p>
                <p className="text-[9px] text-muted/45">Play a hand and you take the first seat.</p>
              </div>
            ) : (
              top.map((row) => (
                <div key={row.userId} className={cn("flex items-center gap-3 px-4 py-3", row.isCurrentUser && "bg-gold/[0.04]")}>
                  <span className={cn("w-5 text-[11px] font-semibold tabular-nums", row.rank === 1 ? "text-gold" : "text-muted/60")}>
                    {String(row.rank).padStart(2, "0")}
                  </span>
                  <UserAvatar
                    name={row.name}
                    userId={row.userId}
                    avatarPreset={row.avatarPreset}
                    avatarUrl={row.avatarUrl}
                    size="sm"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-medium text-ink">{row.name}</p>
                    <p className="text-[9px] text-muted/45">{row.totalBets} rounds</p>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-[11px] font-semibold tabular-nums", row.netProfitCents >= 0 ? "text-green" : "text-red")}>
                      {row.netProfitCents >= 0 ? "+" : ""}
                      {formatCents(row.netProfitCents, { compact: true })}
                    </p>
                    <p className="text-[9px] text-muted/45">{formatMultiplier(row.biggestMultiplier)} best</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>

      <section id="rules" className="scroll-mt-24 grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="surface p-6 sm:p-8">
          <div className="flex items-center gap-3">
            <span className="h-px w-7 bg-gold/50" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-gold/80">Blackjack rules</p>
          </div>
          <h2 className="mt-4 text-3xl text-ink">The flagship, in detail.</h2>
          <div className="mt-7 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
            {rules.map((rule) => (
              <div key={rule.label} className="flex items-center justify-between border-b border-line/50 pb-3">
                <span className="text-[11px] text-muted">{rule.label}</span>
                <span className="text-[11px] font-medium text-ink">{rule.value}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-muted/60">
            <span className="flex items-center gap-1.5"><Check className="size-3 text-green" /> Blackjack pays 3:2</span>
            <span className="flex items-center gap-1.5"><Check className="size-3 text-green" /> Push returns the stake</span>
            <span className="flex items-center gap-1.5"><Check className="size-3 text-green" /> Dealer peeks for blackjack</span>
          </div>
        </div>

        <div className="surface relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -right-16 -top-16 size-48 rounded-full bg-green/5 blur-3xl" />
          <ShieldCheck className="size-5 text-green" />
          <h2 className="mt-4 text-2xl text-ink">Every result, verifiable.</h2>
          <p className="mt-3 text-[11px] leading-5 text-muted">
            The server commits to a seed before you play. Rotate the pair and the previous server seed is revealed,
            along with the exact input, nonce and outcome.
          </p>
          <Link href="/fairness" className="mt-5 inline-flex items-center gap-1.5 text-[11px] font-medium text-gold transition hover:text-gold-strong">
            Inspect your seeds <ArrowRight className="size-3.5" />
          </Link>
          <div className="mt-6 grid grid-cols-2 gap-3 border-t border-line/60 pt-5">
            <div>
              <p className="font-display text-xl text-ink">SHA-256</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-muted/50">Commitment</p>
            </div>
            <div>
              <p className="font-display text-xl text-ink">HMAC</p>
              <p className="mt-1 text-[9px] uppercase tracking-[0.14em] text-muted/50">Outcome source</p>
            </div>
          </div>
        </div>
      </section>

      <section className="flex flex-col items-start justify-between gap-4 border-t border-line/70 pt-8 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <Sparkles className="size-4 text-gold" />
          <p className="text-[11px] text-muted">
            Your temporary seat is ready. No signup, no deposits, no real-money prizes.
          </p>
        </div>
        <Button asChild variant="secondary" size="sm">
          <Link href="#games">
            Pick a table <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </section>
    </div>
  );
}
