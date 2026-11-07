"use client";

import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Hand, Sparkles, Spade } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { BetAmountControl, useBetAmount } from "@/components/games/bet-controls";
import { useGameResult } from "@/components/games/use-game-result";
import { useProgressionBet } from "@/components/games/use-progression-bet";
import { PlayingCard } from "@/components/games/playing-card";

type HandStatus = "active" | "stood" | "bust";
type PublicHand = {
  cards: string[];
  total: number;
  soft: boolean;
  status: HandStatus;
  betCents: number;
  fromSplit: boolean;
  doubled: boolean;
  active: boolean;
};
type BlackjackPublic = {
  phase: "insurance" | "player" | "settled";
  dealerCards: string[];
  dealerHidden: boolean;
  dealerTotal: number | null;
  hands: PublicHand[];
  activeHand: number;
  insuranceOffered: boolean;
  insuranceBet: number;
  totalStake: number;
  availableActions: string[];
  message: string;
  dealerBlackjack?: boolean;
  insurancePayout?: number;
  payouts?: { betCents: number; payoutCents: number; outcome: string }[];
  totalPayout?: number;
};

export function BlackjackGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const { activeBet, setActiveBet } = useProgressionBet(game.id);
  const result = useGameResult(game.id);
  const state = activeBet?.result as BlackjackPublic | undefined;
  const isActive = activeBet?.status === "active";
  const settled = activeBet?.status === "settled";
  const activeHand = state?.hands[state.activeHand];

  const start = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/blackjack/start", {
        method: "POST",
        body: JSON.stringify({ amountCents, input: {}, idempotencyKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const act = useMutation({
    mutationFn: (type: string) =>
      apiFetch<PublicBet>(`/api/games/blackjack/${activeBet?.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: { type }, actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const busy = start.isPending || act.isPending;
  const available = state?.availableActions ?? [];
  const totalStake = state?.totalStake ?? activeBet?.amountCents ?? amountCents;
  const balance = session.wallet.balanceCents;
  const canDouble = available.includes("double") && activeHand && balance >= activeHand.betCents;
  const canSplit = available.includes("split") && activeHand && balance >= activeHand.betCents;
  const canTakeInsurance = available.includes("take-insurance") && balance >= Math.floor(totalStake / 2);
  const net = activeBet ? activeBet.payoutCents - activeBet.amountCents : 0;

  const dealerCards = state?.dealerCards ?? [];
  const dealerHidden = state?.dealerHidden ?? true;

  return (
    <GamePageLayout
      game={game}
      controls={
        <section className="surface p-4">
          <BetAmountControl game={game} balanceCents={balance} amount={amount} setAmount={setAmount} disabled={isActive || busy} />
          <div className="my-4 h-px bg-line/60" />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Total stake</p>
              <p className="mt-1 font-display text-lg font-bold text-green">{formatCents(totalStake)}</p>
            </div>
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Hand bet</p>
              <p className="mt-1 font-display text-lg font-bold text-white">{formatCents(activeHand?.betCents ?? amountCents)}</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary mt-4 w-full" disabled={!valid || isActive || busy} onClick={() => start.mutate()}>
            {busy ? "Dealing…" : settled ? "New hand" : "Deal cards"}
          </button>
          <div className="mt-4 rounded-lg border border-line/50 bg-[#0f212e]/60 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted/55">Rules</p>
            <div className="mt-2 space-y-1 text-[10px] text-muted">
              <p className="flex justify-between"><span>Blackjack</span><span className="text-white">3:2</span></p>
              <p className="flex justify-between"><span>Dealer</span><span className="text-white">Stands on 17</span></p>
              <p className="flex justify-between"><span>Insurance</span><span className="text-white">2:1</span></p>
              <p className="flex justify-between"><span>Splits</span><span className="text-white">Up to 4 hands</span></p>
            </div>
          </div>
          {settled ? (
            <p className={cn("mt-4 text-center text-[11px] font-bold", net > 0 ? "text-green" : net === 0 ? "text-muted" : "text-red/80")}>
              {net > 0 ? `You won ${formatCents(net)}` : net === 0 ? "Push — stake returned" : `You lost ${formatCents(Math.abs(net))}`}
            </p>
          ) : null}
        </section>
      }
      stage={
        <section className="surface relative min-h-[550px] overflow-hidden p-4 sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_30%,rgba(24,90,58,0.18),transparent_55%)]" />
          <div className="relative flex min-h-[500px] flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <Spade className="size-3.5 text-green" /> Blackjack
              </div>
              <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", settled ? (net > 0 ? "border-green/30 bg-green/10 text-green" : "border-line/60 bg-[#0f212e] text-muted") : "border-green/30 bg-green/10 text-green")}>
                {settled ? `Settled · ${formatCents(activeBet?.payoutCents ?? 0)}` : !isActive ? "Ready to deal" : state?.phase === "insurance" ? "Insurance?" : "Your move"}
              </div>
            </div>

            <div className="mt-7 flex flex-col items-center">
              <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-muted/60">Dealer {state?.dealerTotal !== null && state?.dealerTotal !== undefined ? `· ${state.dealerTotal}` : ""}</p>
              <div className="mt-3 flex min-h-[104px] items-center gap-1.5">
                {dealerCards.length === 0 ? (
                  <>
                    <PlayingCard hidden size="md" />
                    <PlayingCard hidden size="md" delay={0.1} />
                  </>
                ) : (
                  <>
                    {dealerCards.map((card, index) => (
                      <PlayingCard key={`${card}-${index}`} card={card} size="md" delay={index * 0.08} />
                    ))}
                    {dealerHidden ? <PlayingCard hidden size="md" delay={dealerCards.length * 0.08} /> : null}
                  </>
                )}
              </div>
            </div>

            <div className="mt-8 flex flex-1 flex-col justify-end">
              <div className="flex flex-wrap items-end justify-center gap-3">
                {(state?.hands ?? []).length === 0 ? (
                  <div className="flex gap-1.5 opacity-40">
                    <PlayingCard hidden size="md" />
                    <PlayingCard hidden size="md" delay={0.1} />
                  </div>
                ) : (
                  (state?.hands ?? []).map((hand, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        "min-w-[150px] rounded-xl border p-2.5 transition",
                        hand.active ? "border-green/40 bg-green/[0.04]" : "border-line/50 bg-[#0f212e]/55",
                      )}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[9px] font-bold uppercase tracking-wider text-muted">{index === 0 ? "Player" : `Hand ${index + 1}`}</p>
                        <p className="font-display text-lg font-bold text-white">{hand.total}</p>
                      </div>
                      <div className="mt-2 flex items-center gap-1">
                        {hand.cards.map((card, cardIndex) => (
                          <PlayingCard key={`${card}-${cardIndex}`} card={card} size="sm" delay={cardIndex * 0.05} />
                        ))}
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <span className={cn("text-[9px] font-semibold capitalize", hand.status === "bust" ? "text-red" : hand.status === "stood" ? "text-muted" : "text-green")}>
                          {hand.status === "active" ? "In play" : hand.status}
                        </span>
                        <span className="text-[9px] font-bold text-muted">{formatCents(hand.betCents)}</span>
                      </div>
                    </motion.div>
                  ))
                )}
              </div>
            </div>

            {state?.phase === "insurance" ? (
              <div className="mx-auto mt-5 w-full max-w-[460px] rounded-xl border border-amber/30 bg-amber/[0.06] p-3">
                <div className="flex items-center gap-2">
                  <Hand className="size-4 text-amber" />
                  <div>
                    <p className="text-[11px] font-bold text-white">Dealer shows an Ace</p>
                    <p className="text-[9px] text-muted">Insurance costs {formatCents(Math.floor(totalStake / 2))} and pays 2:1 if the dealer has blackjack.</p>
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button type="button" disabled={!canTakeInsurance || busy} onClick={() => act.mutate("take-insurance")} className="btn btn-secondary h-9 text-[10px]">
                    Take insurance
                  </button>
                  <button type="button" disabled={busy} onClick={() => act.mutate("decline-insurance")} className="btn btn-ghost h-9 text-[10px]">
                    No insurance
                  </button>
                </div>
              </div>
            ) : null}

            {isActive && state?.phase === "player" ? (
              <div className="mx-auto mt-5 grid w-full max-w-[520px] grid-cols-2 gap-2 sm:grid-cols-4">
                <button type="button" disabled={!available.includes("hit") || busy} onClick={() => act.mutate("hit")} className="btn btn-primary h-11 text-xs">Hit</button>
                <button type="button" disabled={!available.includes("stand") || busy} onClick={() => act.mutate("stand")} className="btn btn-secondary h-11 text-xs">Stand</button>
                <button type="button" disabled={!canDouble || busy} onClick={() => act.mutate("double")} className="btn btn-secondary h-11 text-xs">Double</button>
                <button type="button" disabled={!canSplit || busy} onClick={() => act.mutate("split")} className="btn btn-secondary h-11 text-xs">Split</button>
              </div>
            ) : null}

            {settled ? (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mx-auto mt-5 w-full max-w-[520px] rounded-xl border border-line/50 bg-[#0f212e]/70 p-4 text-center">
                <p className="text-[10px] uppercase tracking-[0.16em] text-muted/60">Round result</p>
                <p className={cn("mt-1 font-display text-2xl font-bold", net > 0 ? "text-green" : net === 0 ? "text-white" : "text-red/80")}>
                  {state?.dealerBlackjack ? "Dealer blackjack" : net > 0 ? "You win" : net === 0 ? "Push" : "Dealer wins"}
                </p>
                <p className="mt-1 text-[11px] text-muted">
                  Stake {formatCents(activeBet?.amountCents ?? 0)} · Payout {formatCents(activeBet?.payoutCents ?? 0)}
                </p>
              </motion.div>
            ) : null}

            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted">
              <Sparkles className="size-3 text-green" />
              {isActive ? "Playing against the dealer. Stand on your best total." : settled ? "Start a new hand to play again." : "Deal a hand and beat the dealer to 21."}
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Spade className="size-4 text-green" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Blackjack:</strong> split matching cards, double your first two, and take insurance when the dealer shows an Ace.
          </p>
        </div>
      }
    />
  );
}
