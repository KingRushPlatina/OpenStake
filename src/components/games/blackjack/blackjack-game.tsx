"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Spade } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import type { BlackjackAction, BlackjackState } from "@/types/blackjack";
import { apiFetch } from "@/lib/api-client";
import { newRequestKey } from "@/lib/client-utils";
import { formatCents, parseAmountToCents } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LiveBets } from "@/components/casino/live-bets";
import { useGameResult } from "@/components/games/use-game-result";
import { useProgressionBet } from "@/components/games/use-progression-bet";
import { BlackjackTable } from "./blackjack-table";
import { RecentHands } from "./recent-hands";
import { FairnessCard, RulesCard } from "./side-cards";

const chipOptions = [1, 5, 25, 100];

export function BlackjackGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const tableRef = useRef<HTMLDivElement>(null);
  const [amount, setAmount] = useState("1.00");
  const { activeBet, setActiveBet } = useProgressionBet(game.id);
  const result = useGameResult();
  const state = activeBet?.result as BlackjackState | undefined;
  const isActive = activeBet?.status === "active";
  const settled = activeBet?.status === "settled";
  const amountCents = parseAmountToCents(amount);
  const valid = amountCents >= game.minBetCents && amountCents <= game.maxBetCents;
  const balance = session.wallet.balanceCents;
  const activeHand = state?.hands[state.activeHand];
  const totalStake = state?.totalStake ?? activeBet?.amountCents ?? amountCents;
  const net = activeBet ? activeBet.payoutCents - activeBet.amountCents : 0;

  const availableActions = (state?.availableActions ?? []).filter((action) => {
    if (action === "double" || action === "split") return Boolean(activeHand) && balance >= (activeHand?.betCents ?? 0);
    if (action === "take-insurance") return balance >= Math.floor(totalStake / 2);
    return true;
  });

  const start = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/blackjack/start", {
        method: "POST",
        body: JSON.stringify({ amountCents, input: {}, idempotencyKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
      if (window.matchMedia("(max-width: 1279px)").matches) {
        window.setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      }
    },
    onError: result.onError,
  });

  const act = useMutation({
    mutationFn: (action: BlackjackAction) =>
      apiFetch<PublicBet>(`/api/games/blackjack/${activeBet?.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: { type: action }, actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const busy = start.isPending || act.isPending;

  useEffect(() => {
    if (!isActive || state?.phase !== "player" || busy) return;
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const map: Record<string, BlackjackAction> = { h: "hit", s: "stand", d: "double", p: "split" };
      const action = map[event.key.toLowerCase()];
      if (action && availableActions.includes(action)) act.mutate(action);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [act, availableActions, busy, isActive, state?.phase]);

  const setCents = (cents: number) => {
    setAmount((Math.max(0, Math.min(game.maxBetCents, cents)) / 100).toFixed(2));
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/" className="grid size-8 place-items-center rounded-full border border-line text-muted transition hover:border-line-strong hover:text-ink" aria-label="Back to lobby">
              <ArrowLeft className="size-3.5" />
            </Link>
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted/55">
              <Spade className="size-3 text-gold" />
              OpenStake Originals · Table 01
            </div>
          </div>
          <h1 className="mt-3 text-4xl text-ink sm:text-5xl">
            Blackjack <span className="italic text-gold/80">No. 01</span>
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="gold">3:2 blackjack</Badge>
          <Badge>Dealer stands on soft 17</Badge>
          <Badge>99.5% RTP</Badge>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <aside className="order-first space-y-4 xl:order-2 xl:sticky xl:top-[96px] xl:self-start">
          <section className="surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/55">Your seat</p>
                <p className="mt-1 text-[13px] font-medium text-ink">{session.user.name}</p>
              </div>
              <span className="rounded-full border border-green/20 bg-green/10 px-2.5 py-1 text-[9px] font-semibold text-green">Guest</span>
            </div>

            <div className="mt-5 border-t border-line/60 pt-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/55">Available</p>
              <p className="mt-1 font-display text-[38px] leading-none text-ink">{formatCents(balance)}</p>
              <p className="mt-1.5 text-[10px] text-muted/50">Virtual credits · no cash value</p>
            </div>

            <div className="mt-5">
              <div className="flex items-center justify-between">
                <label htmlFor="stake" className="text-[10px] font-medium text-muted">Stake</label>
                <span className="text-[9px] text-muted/45">${game.minBetCents / 100} — ${game.maxBetCents / 100}</span>
              </div>
              <div className="mt-2 flex h-12 items-center rounded-xl border border-line bg-[#0a0e0c] px-3 transition focus-within:border-gold/40">
                <span className="text-sm text-muted">$</span>
                <input
                  id="stake"
                  inputMode="decimal"
                  value={amount}
                  disabled={isActive || busy}
                  onChange={(event) => {
                    const next = event.target.value.replace(/[^0-9.]/g, "");
                    if ((next.match(/\./g) ?? []).length <= 1) setAmount(next);
                  }}
                  onBlur={() => {
                    const cents = parseAmountToCents(amount);
                    if (cents < game.minBetCents) setCents(game.minBetCents);
                    else if (cents > game.maxBetCents) setCents(game.maxBetCents);
                  }}
                  className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] font-semibold text-ink outline-none disabled:opacity-55"
                />
                <button type="button" disabled={isActive || busy} onClick={() => setCents(balance)} className="text-[10px] font-semibold text-gold/80 transition hover:text-gold disabled:opacity-40">
                  Max
                </button>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {chipOptions.map((value) => (
                  <button
                    key={value}
                    type="button"
                    disabled={isActive || busy}
                    onClick={() => setCents(value * 100)}
                    className="relative grid h-10 place-items-center rounded-full border border-line bg-surface-2 text-[10px] font-semibold text-muted transition hover:border-gold/30 hover:text-ink disabled:opacity-40"
                  >
                    <span className="absolute inset-[3px] rounded-full border border-dashed border-white/10" />
                    ${value}
                  </button>
                ))}
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {[
                  { label: "½", value: Math.max(game.minBetCents, Math.floor(amountCents / 2)) },
                  { label: "2×", value: Math.min(game.maxBetCents, amountCents * 2) },
                  { label: "All in", value: Math.min(game.maxBetCents, balance) },
                ].map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    disabled={isActive || busy}
                    onClick={() => setCents(option.value)}
                    className="h-8 rounded-lg border border-line/70 text-[9px] font-medium text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-40"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-5 flex items-center justify-between rounded-xl border border-line/60 bg-surface-2/60 px-3.5 py-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-muted/50">Stake</p>
                <p className="mt-1 text-[13px] font-semibold text-ink tabular-nums">{formatCents(isActive ? totalStake : amountCents)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-[0.16em] text-muted/50">Blackjack pays</p>
                <p className="mt-1 text-[13px] font-semibold text-gold tabular-nums">{formatCents(Math.floor((isActive ? totalStake : amountCents) * 2.5))}</p>
              </div>
            </div>

            <Button
              type="button"
              size="lg"
              className="mt-4 w-full"
              disabled={isActive || busy || !valid}
              onClick={() => start.mutate()}
            >
              {start.isPending ? "Dealing…" : act.isPending ? "Settling…" : isActive ? "Hand in play" : settled ? "Deal again" : "Deal cards"}
            </Button>
            {!valid ? (
              <p className="mt-2 text-[10px] text-red/80">Stake must be between {formatCents(game.minBetCents)} and {formatCents(game.maxBetCents)}.</p>
            ) : null}
          </section>

          <div className="hidden space-y-4 xl:block">
            <RulesCard />
            <FairnessCard serverSeedHash={session.seed?.serverSeedHash} nonce={session.seed?.nonce} />
          </div>
        </aside>

        <div className="order-2 min-w-0 space-y-5 xl:order-1">
          <div ref={tableRef} className="scroll-mt-24">
            <BlackjackTable
              state={state}
              activeBet={activeBet}
              isActive={Boolean(isActive)}
              settled={Boolean(settled)}
              busy={busy}
              amountCents={isActive ? totalStake : amountCents}
              net={net}
              availableActions={availableActions}
              onAction={(action) => act.mutate(action)}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:hidden">
            <RulesCard />
            <FairnessCard serverSeedHash={session.seed?.serverSeedHash} nonce={session.seed?.nonce} />
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
            <RecentHands />
            <LiveBets limit={8} />
          </div>
        </div>
      </div>
    </div>
  );
}
