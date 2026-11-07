"use client";

import { motion } from "motion/react";
import { Hand, RotateCcw, ShieldCheck, Trash2, X } from "lucide-react";
import type { PublicBet } from "@/modules/games/types";
import {
  BLACKJACK_MAX_HAND_BET_CENTS,
  type BlackjackAction,
  type BlackjackHandOutcome,
  type BlackjackState,
  type PublicHand,
} from "@/types/blackjack";
import { PlayingCard } from "@/components/games/playing-card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";
import { ChipButton, ChipStack, chipDenominations } from "./chip";

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

function DealerShoe() {
  return (
    <div className="pointer-events-none hidden flex-col items-center gap-1.5 sm:flex">
      <div className="relative h-[58px] w-[46px]">
        <span className="absolute left-0 top-2 h-[42px] w-[30px] rotate-[-8deg] rounded-[4px] border border-gold/20 bg-[#0a241b] shadow-[0_6px_14px_rgba(0,0,0,0.4)]">
          <span className="absolute inset-[2px] rounded-[3px] border border-gold/10" />
        </span>
        <span className="absolute left-[7px] top-1 h-[42px] w-[30px] rotate-[-2deg] rounded-[4px] border border-gold/25 bg-[#0c2c21] shadow-[0_8px_16px_rgba(0,0,0,0.42)]">
          <span className="absolute inset-[2px] rounded-[3px] border border-gold/12" />
        </span>
        <span className="absolute left-[14px] top-0 h-[44px] w-[31px] rounded-[4px] border border-gold/30 bg-[#0e3327] shadow-[0_10px_20px_rgba(0,0,0,0.45)]">
          <span className="absolute inset-[2px] rounded-[3px] border border-gold/12" />
          <span className="absolute inset-0 grid place-items-center font-display text-[11px] text-gold/60">O</span>
        </span>
      </div>
      <span className="text-[7px] font-semibold uppercase tracking-[0.18em] text-ink/25">6 decks</span>
    </div>
  );
}

function outcomeLabel(hand: PublicHand, payout: BlackjackHandOutcome | undefined) {
  if (hand.status === "bust") return { label: "Bust", tone: "text-red/85" };
  if (payout) {
    if (payout.outcome === "blackjack") return { label: "Blackjack", tone: "text-gold" };
    if (payout.outcome === "win") return { label: "Win", tone: "text-green" };
    if (payout.outcome === "push") return { label: "Push", tone: "text-ink/80" };
    if (payout.outcome === "lose") return { label: "Lost", tone: "text-red/70" };
  }
  if (hand.active) return { label: "Playing", tone: "text-gold/85" };
  if (hand.doubled) return { label: "Doubled", tone: "text-muted/65" };
  if (hand.status === "stood") return { label: "Stand", tone: "text-muted/60" };
  return { label: "In play", tone: "text-muted/55" };
}

function HandBox({
  hand,
  index,
  payout,
  settled,
}: {
  hand: PublicHand;
  index: number;
  payout?: BlackjackHandOutcome;
  settled: boolean;
}) {
  const state = outcomeLabel(hand, payout);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex min-h-[152px] w-full flex-col rounded-2xl border px-2.5 pb-2.5 pt-2 transition",
        hand.active ? "border-gold/55 bg-black/20 shadow-[0_0_0_1px_rgba(216,184,120,0.11),0_0_26px_rgba(216,184,120,0.05)]" : "border-white/[0.08] bg-black/10",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={cn("text-[8px] font-semibold uppercase tracking-[0.18em]", hand.active ? "text-gold/85" : "text-ink/40")}>
          Box {index + 1}
          {hand.fromSplit ? <span className="ml-1.5 text-[7px] text-muted/45">split</span> : null}
        </span>
        <span
          className={cn(
            "rounded-full border px-1.5 py-0.5 text-[9px] font-semibold tabular-nums",
            hand.status === "bust" ? "border-red/25 text-red" : hand.total === 21 ? "border-gold/30 text-gold" : "border-white/10 text-ink/80",
          )}
        >
          {hand.total}
          {hand.soft ? <span className="ml-0.5 text-[7px] opacity-60">s</span> : null}
        </span>
      </div>
      <div className="mt-2 flex flex-1 flex-wrap items-end justify-center gap-0.5">
        {hand.cards.map((card, cardIndex) => (
          <PlayingCard
            key={`${card}-${cardIndex}`}
            card={card}
            size={hand.cards.length > 3 ? "xs" : "sm"}
            delay={cardIndex * 0.04}
          />
        ))}
      </div>
      <div className="mt-2 flex items-end justify-between gap-1.5">
        <ChipStack amountCents={hand.betCents} size="xs" />
        <div className="text-right">
          <p className={cn("text-[7px] font-semibold uppercase tracking-[0.14em]", state.tone)}>{state.label}</p>
          <p className="mt-0.5 text-[9px] font-semibold tabular-nums text-ink/75">{formatCents(hand.betCents)}</p>
          {settled && payout ? (
            <p className={cn("text-[8px] font-semibold tabular-nums", payout.payoutCents > hand.betCents ? "text-green" : payout.payoutCents === hand.betCents ? "text-ink/70" : "text-muted/50")}>
              {payout.payoutCents > 0 ? `+${formatCents(payout.payoutCents)}` : "—"}
            </p>
          ) : null}
        </div>
      </div>
    </motion.div>
  );
}

function SpotBox({
  index,
  chips,
  selectedChip,
  disabled,
  onAdd,
  onClear,
}: {
  index: number;
  chips: number[];
  selectedChip: number;
  disabled: boolean;
  onAdd: () => void;
  onClear: () => void;
}) {
  const amountCents = chips.reduce((sum, chip) => sum + chip, 0);
  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        aria-label={`Box ${index + 1}: add ${formatCents(selectedChip)} chip`}
        className={cn(
          "group relative flex min-h-[152px] w-full flex-col items-center justify-center rounded-2xl border border-dashed px-2.5 py-3 text-center transition",
          chips.length > 0
            ? "border-gold/35 bg-black/20 hover:border-gold/50"
            : "border-white/[0.12] bg-black/[0.07] hover:border-gold/30 hover:bg-black/15",
          disabled && "cursor-default opacity-70",
        )}
      >
        <span className="absolute inset-x-2.5 top-2 flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.16em]">
          <span className={chips.length > 0 ? "text-gold/70" : "text-ink/30"}>Box {index + 1}</span>
          <span className="text-muted/35">{chips.length > 0 ? "Bet" : "Empty"}</span>
        </span>
        {amountCents > 0 ? (
          <span className="mt-4 flex flex-col items-center gap-2.5">
            <motion.span
              key={chips.length}
              initial={{ scale: 0.82, y: -8, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 24 }}
            >
              <ChipStack amountCents={amountCents} size="md" />
            </motion.span>
            <span className="rounded-full border border-gold/25 bg-black/25 px-2.5 py-1 text-[10px] font-semibold tabular-nums text-gold">
              {formatCents(amountCents)}
            </span>
            <span className="text-[7px] uppercase tracking-[0.16em] text-muted/40">Click to stack</span>
          </span>
        ) : (
          <span className="mt-4 flex flex-col items-center gap-2">
            <span className="grid size-16 place-items-center rounded-full border border-dashed border-gold/25 transition group-hover:border-gold/40">
              <span className="grid size-11 place-items-center rounded-full border border-gold/15 bg-black/15 text-[8px] font-semibold uppercase tracking-[0.14em] text-gold/55">
                Bet
              </span>
            </span>
            <span className="text-[8px] uppercase tracking-[0.16em] text-muted/35">Place a chip</span>
          </span>
        )}
      </button>
      {amountCents > 0 && !disabled ? (
        <button
          type="button"
          onClick={onClear}
          aria-label={`Clear box ${index + 1}`}
          className="absolute right-1.5 top-1.5 z-10 grid size-5 place-items-center rounded-full border border-white/10 bg-black/40 text-muted/60 transition hover:border-red/35 hover:text-red"
        >
          <X className="size-2.5" />
        </button>
      ) : null}
    </div>
  );
}

export function BlackjackTable({
  state,
  activeBet,
  isActive,
  settled,
  busy,
  spots,
  selectedChip,
  balanceCents,
  maxHandCents = BLACKJACK_MAX_HAND_BET_CENTS,
  net,
  availableActions,
  onAction,
  onSelectChip,
  onPlaceChip,
  onClearSpot,
  onUndo,
  onClearAll,
  onDeal,
  onRebet,
  onNewBet,
  onReload,
  reloading,
}: {
  state?: BlackjackState;
  activeBet: PublicBet | null;
  isActive: boolean;
  settled: boolean;
  busy: boolean;
  spots: number[][];
  selectedChip: number;
  balanceCents: number;
  maxHandCents?: number;
  net: number;
  availableActions: string[];
  onAction: (action: BlackjackAction) => void;
  onSelectChip: (cents: number) => void;
  onPlaceChip: (index: number) => void;
  onClearSpot: (index: number) => void;
  onUndo: () => void;
  onClearAll: () => void;
  onDeal: () => void;
  onRebet: () => void;
  onNewBet: () => void;
  onReload: () => void;
  reloading: boolean;
}) {
  const available = availableActions;
  const dealerCards = state?.dealerCards ?? [];
  const dealerHidden = state?.dealerHidden ?? true;
  const hands = state?.hands ?? [];
  const phase = state?.phase;
  const playerTurn = isActive && phase === "player";
  const insuranceTurn = isActive && phase === "insurance";
  const showHands = hands.length > 0 && (isActive || settled);
  const totalCents = spots.reduce((total, chips) => total + chips.reduce((sum, chip) => sum + chip, 0), 0);
  const boxCount = spots.filter((chips) => chips.length > 0).length;
  const canDeal = totalCents > 0 && totalCents <= balanceCents && !busy && !isActive;
  const gridClass = showHands
    ? hands.length === 1
      ? "mx-auto w-full max-w-md grid-cols-1"
      : hands.length === 2
        ? "grid-cols-2"
        : hands.length === 3
          ? "grid-cols-2 sm:grid-cols-3"
          : "grid-cols-2 sm:grid-cols-4"
    : "grid-cols-2 sm:grid-cols-4";
  const payouts = state?.payouts ?? [];

  return (
    <section className="table-felt relative overflow-hidden rounded-[26px] border border-[#2c4a3b] p-4 sm:p-6">
      <div className="pointer-events-none absolute inset-3 rounded-[20px] border border-gold/10" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/20 to-transparent" />

      <div className="relative flex min-h-[600px] flex-col sm:min-h-[650px]">
        <div className="flex items-center justify-between text-[8px] font-semibold uppercase tracking-[0.2em] text-ink/35">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full border border-green/25 bg-green/10 px-2.5 py-1 text-green">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-green opacity-60" />
                <span className="relative inline-flex size-1.5 rounded-full bg-green" />
              </span>
              Live table
            </span>
            <span className="rounded-full border border-gold/15 bg-black/15 px-2.5 py-1 text-gold/60">Table 01</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="hidden items-center gap-1 sm:flex">
              <ShieldCheck className="size-2.5" /> Verifiable
            </span>
            <span className="rounded-full border border-white/10 px-2.5 py-1">$1 — $1K / box</span>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto] items-start gap-4">
          <div className="flex flex-col items-center">
            <div className="flex items-center gap-2">
              <p className="text-[8px] font-semibold uppercase tracking-[0.3em] text-ink/35">Dealer</p>
              {state?.dealerTotal !== null && state?.dealerTotal !== undefined ? (
                <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-semibold text-ink/70">{state.dealerTotal}</span>
              ) : null}
              {state?.dealerBlackjack ? <span className="text-[8px] font-semibold uppercase tracking-[0.14em] text-gold">blackjack</span> : null}
            </div>
            <div className="mt-2.5 flex min-h-[100px] items-center gap-1.5">
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
          <DealerShoe />
        </div>

        <div className="my-4 hidden sm:block">
          <TableArc />
        </div>
        <div className="my-3 h-px w-full bg-gold/10 sm:hidden" />

        <div className="flex flex-1 flex-col justify-end">
          <div className={cn("grid items-stretch gap-2.5", gridClass)}>
            {showHands
              ? hands.map((hand, index) => (
                  <HandBox key={index} hand={hand} index={index} payout={payouts[index]} settled={settled} />
                ))
              : spots.map((chips, index) => (
                  <SpotBox
                    key={index}
                    index={index}
                    chips={chips}
                    selectedChip={selectedChip}
                    disabled={isActive || settled || busy}
                    onAdd={() => onPlaceChip(index)}
                    onClear={() => onClearSpot(index)}
                  />
                ))}
          </div>

          {hands.length > 0 && showHands ? (
            <p className="mt-2 text-center text-[8px] uppercase tracking-[0.16em] text-muted/35">
              {hands.length === 1 ? "1 box in play" : `${hands.length} boxes in play`} · max {formatCents(maxHandCents)} per box
            </p>
          ) : null}

          {settled && state ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-auto mt-4 flex w-full max-w-lg flex-wrap items-center justify-between gap-4 rounded-xl border border-gold/20 bg-[#07130e]/60 px-4 py-3 backdrop-blur-sm"
            >
              <div>
                <p className="text-[8px] font-semibold uppercase tracking-[0.22em] text-muted/55">
                  {net > 0 ? "Round won" : net === 0 ? "Push" : "Dealer wins"}
                </p>
                <p className={cn("mt-0.5 font-display text-2xl", net > 0 ? "text-gold" : net === 0 ? "text-ink" : "text-red/80")}>
                  {net > 0 ? `+${formatCents(net)}` : net === 0 ? formatCents(0) : `-${formatCents(Math.abs(net))}`}
                </p>
              </div>
              <div className="flex gap-5 text-right">
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-muted/45">Chips</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-ink/85 tabular-nums">{formatCents(activeBet?.amountCents ?? state.totalStake)}</p>
                </div>
                <div>
                  <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-muted/45">Returned</p>
                  <p className="mt-0.5 text-[11px] font-semibold text-ink/85 tabular-nums">{formatCents(activeBet?.payoutCents ?? state.totalPayout ?? 0)}</p>
                </div>
              </div>
            </motion.div>
          ) : null}

          {!isActive && !settled ? (
            <div className="mt-4 rounded-2xl border border-gold/12 bg-black/20 p-3 sm:p-3.5">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[8px] font-semibold uppercase tracking-[0.2em] text-gold/55">Chip tray</p>
                <p className="text-[9px] font-medium tabular-nums text-muted/55">
                  {boxCount === 0 ? "No chips on the felt" : `${boxCount} ${boxCount === 1 ? "box" : "boxes"} · ${formatCents(totalCents)}`}
                </p>
              </div>
              <div className="mt-2.5 flex items-center justify-center gap-1.5 sm:gap-2.5">
                {chipDenominations.map((chip) => (
                  <ChipButton
                    key={chip.cents}
                    cents={chip.cents}
                    selected={selectedChip === chip.cents}
                    disabled={busy || chip.cents > balanceCents}
                    onClick={() => onSelectChip(chip.cents)}
                    size="md"
                  />
                ))}
              </div>
              {totalCents > balanceCents ? (
                <div className="mt-3 flex items-center justify-between gap-2 rounded-lg border border-red/25 bg-red/[0.06] px-2.5 py-2">
                  <p className="text-[9px] leading-4 text-red/85">Your balance is lower than this bet.</p>
                  <button
                    type="button"
                    onClick={onReload}
                    disabled={reloading}
                    className="shrink-0 rounded-md bg-gold px-2 py-1 text-[9px] font-semibold text-[#14100a] transition hover:bg-gold-strong disabled:opacity-50"
                  >
                    {reloading ? "Reloading…" : "Reload"}
                  </button>
                </div>
              ) : null}
              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="flex flex-1 items-center gap-1.5">
                  <button
                    type="button"
                    onClick={onUndo}
                    disabled={totalCents === 0 || busy}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-line/70 px-2.5 text-[9px] font-medium text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-35"
                  >
                    <RotateCcw className="size-3" /> Undo
                  </button>
                  <button
                    type="button"
                    onClick={onClearAll}
                    disabled={totalCents === 0 || busy}
                    className="flex h-8 items-center gap-1.5 rounded-lg border border-line/70 px-2.5 text-[9px] font-medium text-muted transition hover:border-red/35 hover:text-red disabled:opacity-35"
                  >
                    <Trash2 className="size-3" /> Clear
                  </button>
                  <span className="ml-auto hidden text-[8px] uppercase tracking-[0.12em] text-muted/35 sm:block">
                    Pick a chip · click a box
                  </span>
                </div>
                <Button
                  type="button"
                  size="md"
                  className="h-9 px-5 sm:min-w-[190px]"
                  disabled={!canDeal}
                  onClick={onDeal}
                >
                  {busy ? "Dealing…" : boxCount === 0 ? "Place chips to deal" : `Deal ${boxCount} ${boxCount === 1 ? "hand" : "hands"} · ${formatCents(totalCents)}`}
                </Button>
              </div>
            </div>
          ) : null}

          {settled ? (
            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[9px] text-muted/50">
                {state?.dealerBlackjack ? "Dealer blackjack." : "Round settled."} Rebet the same boxes or clear the felt for a new shape.
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="ghost" onClick={onNewBet} disabled={busy}>
                  New bet
                </Button>
                <Button type="button" size="sm" variant="secondary" onClick={onRebet} disabled={busy}>
                  <RotateCcw className="size-3.5" /> Rebet last chips
                </Button>
              </div>
            </div>
          ) : null}

          <div className={cn("mt-4 border-t border-gold/10 pt-4", !isActive && !settled && "hidden")}>
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
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
