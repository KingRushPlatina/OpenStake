"use client";

import { motion } from "motion/react";
import { Hand, ShieldCheck } from "lucide-react";
import type { PublicBet } from "@/modules/games/types";
import type { BlackjackAction, BlackjackState, PublicHand } from "@/types/blackjack";
import { PlayingCard } from "@/components/games/playing-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";
import { ChipStack } from "./chip";

function TableArc() {
  return (
    <svg viewBox="0 0 600 112" className="mx-auto w-full max-w-[540px]" aria-hidden>
      <path id="blackjack-arc" d="M 28 102 Q 300 4 572 102" fill="none" />
      <path id="blackjack-arc-small" d="M 122 106 Q 300 42 478 106" fill="none" />
      <text fill="#d8b878" fillOpacity="0.62" fontSize="12" fontWeight="600" letterSpacing="5.5" textAnchor="middle">
        <textPath href="#blackjack-arc" startOffset="50%">
          BLACKJACK PAYS 3 TO 2
        </textPath>
      </text>
      <text fill="#f4f1e8" fillOpacity="0.26" fontSize="6.5" fontWeight="500" letterSpacing="4" textAnchor="middle">
        <textPath href="#blackjack-arc-small" startOffset="50%">
          DEALER MUST STAND ON SOFT 17
        </textPath>
      </text>
    </svg>
  );
}

function statusLabel(hand: PublicHand) {
  if (hand.status === "bust") return "Bust";
  if (hand.status === "stood") return hand.doubled ? "Doubled" : "Stand";
  return "In play";
}

function PlayerHand({
  hand,
  index,
  compact,
  settled,
}: {
  hand: PublicHand;
  index: number;
  compact: boolean;
  settled: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative w-full rounded-2xl border px-3 pb-3 pt-2.5 transition",
        hand.active ? "border-gold/45 bg-black/15 shadow-[0_0_0_1px_rgba(216,184,120,0.08)]" : "border-white/[0.07] bg-black/10",
        compact ? "max-w-[190px]" : "max-w-[240px]",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <span className={cn("text-[8px] font-semibold uppercase tracking-[0.18em]", hand.active ? "text-gold/80" : "text-ink/40")}>
          {index === 0 ? "Player" : `Hand ${index + 1}`}
        </span>
        <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold tabular-nums", hand.status === "bust" ? "border-red/25 text-red" : "border-white/10 text-ink/80")}>
          {hand.total}
          {hand.soft ? " soft" : ""}
        </span>
      </div>
      <div className="mt-2.5 flex items-end justify-center gap-1">
        {hand.cards.map((card, cardIndex) => (
          <PlayingCard
            key={`${card}-${cardIndex}`}
            card={card}
            size={compact || hand.cards.length > 3 ? "xs" : "sm"}
            delay={cardIndex * 0.05}
          />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <ChipStack amountCents={hand.betCents} />
        <span
          className={cn(
            "text-[8px] font-semibold uppercase tracking-[0.14em]",
            hand.status === "bust" ? "text-red/80" : settled ? "text-muted/60" : hand.active ? "text-gold/80" : "text-muted/50",
          )}
        >
          {statusLabel(hand)}
        </span>
      </div>
    </motion.div>
  );
}

export function BlackjackTable({
  state,
  activeBet,
  isActive,
  settled,
  busy,
  amountCents,
  net,
  availableActions,
  onAction,
}: {
  state?: BlackjackState;
  activeBet: PublicBet | null;
  isActive: boolean;
  settled: boolean;
  busy: boolean;
  amountCents: number;
  net: number;
  availableActions: string[];
  onAction: (action: BlackjackAction) => void;
}) {
  const available = availableActions;
  const dealerCards = state?.dealerCards ?? [];
  const dealerHidden = state?.dealerHidden ?? true;
  const hands = state?.hands ?? [];
  const compact = hands.length > 2;
  const phase = state?.phase;
  const playerTurn = isActive && phase === "player";
  const insuranceTurn = isActive && phase === "insurance";

  return (
    <section className="table-felt relative overflow-hidden rounded-[26px] border border-[#2c4a3b] p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-3 rounded-[20px] border border-gold/10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/20 to-transparent" />

      <div className="relative flex min-h-[440px] flex-col sm:min-h-[570px]">
        <div className="flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.2em] text-ink/35">
          <div className="flex items-center gap-2">
            <span className="rounded-full border border-gold/15 bg-black/15 px-2.5 py-1 text-gold/60">Table 01</span>
            <span className="hidden sm:inline">Six decks · S17</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 sm:flex">
              <ShieldCheck className="size-2.5" /> Verifiable
            </span>
            <span className="rounded-full border border-white/10 px-2.5 py-1">$0.10 — $500</span>
          </div>
        </div>

        <div className="mt-7 flex flex-col items-center">
          <div className="flex items-center gap-2">
            <p className="text-[8px] font-semibold uppercase tracking-[0.3em] text-ink/35">Dealer</p>
            {state?.dealerTotal !== null && state?.dealerTotal !== undefined ? (
              <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-ink/70">{state.dealerTotal}</span>
            ) : null}
          </div>
          <div className="mt-3 flex min-h-[100px] items-center gap-1.5">
            {dealerCards.length === 0 ? (
              <>
                <PlayingCard hidden size="md" />
                <PlayingCard hidden size="md" delay={0.08} />
              </>
            ) : (
              <>
                {dealerCards.map((card, index) => (
                  <PlayingCard
                    key={`${card}-${index}`}
                    card={card}
                    size={dealerCards.length > 3 ? "sm" : "md"}
                    delay={index * 0.07}
                  />
                ))}
                {dealerHidden ? <PlayingCard hidden size="md" delay={dealerCards.length * 0.07} /> : null}
              </>
            )}
          </div>
        </div>

        <div className="my-5 hidden sm:block">
          <TableArc />
        </div>
        <div className="my-4 h-px w-full bg-gold/10 sm:hidden" />

        <div className="flex flex-1 flex-col justify-end">
          <div className="flex flex-wrap items-end justify-center gap-3">
            {hands.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-6">
                <span className="grid size-24 place-items-center rounded-full border border-dashed border-gold/30 bg-black/10">
                  <span className="grid size-16 place-items-center rounded-full border border-gold/15">
                    <ChipStack amountCents={amountCents} />
                  </span>
                </span>
                <p className="text-[9px] font-semibold uppercase tracking-[0.24em] text-gold/50">
                  {activeBet ? "Hand in play" : "Place your bet"}
                </p>
              </div>
            ) : (
              hands.map((hand, index) => (
                <PlayerHand key={index} hand={hand} index={index} compact={compact} settled={settled} />
              ))
            )}
          </div>

          {settled && state ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-5 flex w-full max-w-md items-center justify-between gap-4 rounded-xl border border-gold/20 bg-[#07130e]/55 px-4 py-3 backdrop-blur-sm"
            >
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-muted/55">
                  {net > 0 ? "Hand won" : net === 0 ? "Push" : "Dealer wins"}
                </p>
                <p className={cn("mt-1 font-display text-2xl", net > 0 ? "text-gold" : net === 0 ? "text-ink" : "text-red/80")}>
                  {net > 0 ? `+${formatCents(net)}` : net === 0 ? formatCents(activeBet?.amountCents ?? 0) : `-${formatCents(Math.abs(net))}`}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-muted/50">Returned</p>
                <p className="mt-1 text-[12px] font-semibold text-ink">{formatCents(activeBet?.payoutCents ?? 0)}</p>
              </div>
            </motion.div>
          ) : null}
        </div>

        <div className="mt-5 border-t border-gold/10 pt-4">
          {insuranceTurn ? (
            <div className="flex flex-col gap-3 rounded-xl border border-gold/20 bg-black/15 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Hand className="size-4 text-gold" />
                <div>
                  <p className="text-[11px] font-semibold text-ink">Dealer shows an ace</p>
                  <p className="text-[9px] text-muted/60">Insurance costs {formatCents(Math.floor((state?.totalStake ?? 0) / 2))} and pays 2:1.</p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="secondary" disabled={busy || !available.includes("take-insurance")} onClick={() => onAction("take-insurance")}>
                  Take insurance
                </Button>
                <Button type="button" size="sm" variant="ghost" disabled={busy} onClick={() => onAction("decline-insurance")}>
                  No thanks
                </Button>
              </div>
            </div>
          ) : playerTurn ? (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[
                { action: "hit" as const, label: "Hit", key: "H", primary: true },
                { action: "stand" as const, label: "Stand", key: "S", primary: false },
                { action: "double" as const, label: "Double", key: "D", primary: false },
                { action: "split" as const, label: "Split", key: "P", primary: false },
              ].map((item) => (
                <Button
                  key={item.action}
                  type="button"
                  size="md"
                  variant={item.primary ? "primary" : "secondary"}
                  disabled={busy || !available.includes(item.action)}
                  onClick={() => onAction(item.action)}
                  className="justify-between px-4"
                >
                  <span>{item.label}</span>
                  <span className="rounded border border-white/15 px-1.5 py-0.5 text-[9px] font-semibold opacity-50">{item.key}</span>
                </Button>
              ))}
            </div>
          ) : settled ? (
            <p className="text-center text-[10px] text-muted/55">
              {state?.dealerBlackjack ? "Dealer blackjack. The house takes this one." : "Hand settled. Deal again when you are ready."}
            </p>
          ) : activeBet && isActive ? (
            <p className="text-center text-[10px] text-muted/55">Dealer is playing. Watch the shoe.</p>
          ) : (
            <p className="text-center text-[10px] text-muted/55">Choose your stake, then deal. The dealer stands on soft 17.</p>
          )}
        </div>
      </div>
    </section>
  );
}
