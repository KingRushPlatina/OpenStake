"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { newRequestKey } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GameShell } from "@/components/games/game-shell";
import { ControlPanel, PlayButton, StatTile } from "@/components/games/controls";
import { useGameResult } from "@/components/games/use-game-result";
import { useFaucetClaim } from "@/components/casino/use-faucet-claim";
import { ChipButton } from "@/components/games/blackjack/chip";
import {
  ROULETTE_MIN_BET_CENTS,
  ROULETTE_SPOT_BY_ID,
  rouletteColor,
  type RouletteBet,
  type RouletteResult,
  type RouletteSpot,
} from "@/lib/roulette";
import { RouletteWheel } from "./roulette-wheel";
import { RouletteTable } from "./roulette-table";

const CHIPS = [100, 500, 2_500, 10_000, 50_000, 100_000] as const;
const SETTLE_REVEAL_MS = 1700;

type Placement = { id: string; cents: number };

const COLOR_CLASSES = {
  red: "border-[#d05660]/50 bg-[#8e1b24] text-[#ffe3e5]",
  black: "border-white/20 bg-[#151515] text-[#f2f0ea]",
  green: "border-[#4fc38c]/45 bg-[#0c5f3c] text-[#d9ffe9]",
} as const;

const PAYOUT_ROWS = [
  { label: "Straight", odds: "35:1" },
  { label: "Split", odds: "17:1" },
  { label: "Street", odds: "11:1" },
  { label: "Corner", odds: "8:1" },
  { label: "Six line", odds: "5:1" },
  { label: "Column / dozen", odds: "2:1" },
  { label: "Red / black / parity", odds: "1:1" },
];

function totalOf(placements: Placement[]) {
  return placements.reduce((sum, placement) => sum + placement.cents, 0);
}

export function RouletteGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const result = useGameResult(game.name);
  const claim = useFaucetClaim();
  const [selectedChip, setSelectedChip] = useState<number>(2_500);
  const [placements, setPlacements] = useState<Placement[]>([]);
  const [lastPlacements, setLastPlacements] = useState<Placement[]>([]);
  const [wheelNumber, setWheelNumber] = useState<number | null>(null);
  const [lastResult, setLastResult] = useState<RouletteResult | null>(null);
  const [recent, setRecent] = useState<number[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [settling, setSettling] = useState(false);
  const [spinToken, setSpinToken] = useState(0);
  const pendingResult = useRef<RouletteResult | null>(null);
  const placementsRef = useRef<Placement[]>([]);
  const settleTimer = useRef<number | undefined>(undefined);
  const spinGuard = useRef(false);

  useEffect(() => {
    placementsRef.current = placements;
  }, [placements]);

  useEffect(
    () => () => {
      window.clearTimeout(settleTimer.current);
    },
    [],
  );

  const balance = session.wallet.balanceCents;
  const totalStake = totalOf(placements);
  const overBalance = totalStake > balance;

  const chipsBySpot = useMemo(() => {
    const map = new Map<string, number[]>();
    for (const placement of placements) {
      const list = map.get(placement.id);
      if (list) list.push(placement.cents);
      else map.set(placement.id, [placement.cents]);
    }
    return map;
  }, [placements]);

  const mutation = useMutation({
    mutationFn: (bets: RouletteBet[]) =>
      apiFetch<PublicBet>("/api/games/roulette/play", {
        method: "POST",
        body: JSON.stringify({
          amountCents: totalStake,
          input: { bets },
          idempotencyKey: newRequestKey(),
        }),
      }),
    onSuccess: (bet) => {
      const payload = bet.result as RouletteResult;
      pendingResult.current = payload;
      setWheelNumber(payload.number);
      setLastResult(null);
      setSpinning(true);
      setSettling(false);
      setSpinToken((token) => token + 1);
      result.onResult(bet);
    },
    onError: (error) => {
      spinGuard.current = false;
      result.onError(error);
    },
  });

  const locked = spinning || settling || mutation.isPending || claim.isPending;
  const canSpin = totalStake >= ROULETTE_MIN_BET_CENTS && !overBalance && !locked;

  const placeChip = useCallback(
    (spot: RouletteSpot) => {
      if (locked) return;
      if (totalStake + selectedChip > balance) {
        toast.error("That chip is above your balance", {
          description: "Remove a chip or win a top-up on the dice.",
        });
        return;
      }
      setPlacements((current) => [...current, { id: spot.id, cents: selectedChip }]);
    },
    [balance, locked, selectedChip, totalStake],
  );

  const removeChip = useCallback(
    (spot: RouletteSpot) => {
      if (locked) return;
      setPlacements((current) => {
        const index = current.map((placement) => placement.id).lastIndexOf(spot.id);
        if (index < 0) return current;
        return [...current.slice(0, index), ...current.slice(index + 1)];
      });
    },
    [locked],
  );

  const clearBets = useCallback(() => {
    if (locked) return;
    setPlacements([]);
  }, [locked]);

  const undoBet = useCallback(() => {
    if (locked) return;
    setPlacements((current) => current.slice(0, -1));
  }, [locked]);

  const rebet = useCallback(() => {
    if (locked || lastPlacements.length === 0) return;
    if (totalOf(lastPlacements) > balance) {
      toast.error("Not enough credits to repeat that bet", {
        description: "Win a dice top-up and try again.",
      });
      return;
    }
    setPlacements(lastPlacements.map((placement) => ({ ...placement })));
  }, [balance, lastPlacements, locked]);

  const handleSpinEnd = useCallback(() => {
    spinGuard.current = false;
    setSpinning(false);
    const payload = pendingResult.current;
    if (!payload) return;
    setLastResult(payload);
    setRecent((current) => [payload.number, ...current].slice(0, 14));
    setSettling(true);
    window.clearTimeout(settleTimer.current);
    settleTimer.current = window.setTimeout(() => {
      setLastPlacements(placementsRef.current.map((placement) => ({ ...placement })));
      setPlacements([]);
      setSettling(false);
    }, SETTLE_REVEAL_MS);
  }, []);

  const spin = useCallback(() => {
    if (!canSpin || spinGuard.current) return;
    spinGuard.current = true;
    const bets: RouletteBet[] = [];
    for (const [id, chips] of chipsBySpot) {
      const spot = ROULETTE_SPOT_BY_ID.get(id);
      if (!spot) continue;
      bets.push({
        kind: spot.kind,
        numbers: spot.numbers,
        group: spot.group,
        amountCents: chips.reduce((sum, chip) => sum + chip, 0),
      });
    }
    mutation.mutate(bets);
  }, [canSpin, chipsBySpot, mutation]);

  const tableResultNumber = !spinning && lastResult ? lastResult.number : null;
  const lastNet = lastResult ? lastResult.totalPayoutCents - lastResult.totalStakeCents : 0;
  const afterSpin = spinning || settling ? balance : Math.max(0, balance - totalStake);

  return (
    <GameShell
      game={game}
      controls={
        <div className="space-y-4">
          <ControlPanel title="Your bet">
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="On the table" value={formatCents(totalStake)} tone="text-gold" />
              <StatTile label="After spin" value={formatCents(afterSpin)} />
            </div>
            <PlayButton disabled={!canSpin || mutation.isPending} onClick={spin}>
              {mutation.isPending || spinning ? "Spinning…" : "Spin the wheel"}
            </PlayButton>
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={undoBet}
                disabled={locked || placements.length === 0}
                className="h-8 rounded-lg border border-line/70 text-[9px] font-medium text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-35"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={clearBets}
                disabled={locked || placements.length === 0}
                className="h-8 rounded-lg border border-line/70 text-[9px] font-medium text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-35"
              >
                Clear
              </button>
              <button
                type="button"
                onClick={rebet}
                disabled={locked || lastPlacements.length === 0}
                className="h-8 rounded-lg border border-line/70 text-[9px] font-medium text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-35"
              >
                Rebet
              </button>
            </div>
            {overBalance ? (
              <div className="flex items-center justify-between gap-2 rounded-lg border border-red/25 bg-red/[0.06] px-2.5 py-2">
                <p className="text-[9px] leading-4 text-red/85">Your stake is above your balance.</p>
                <button
                  type="button"
                  onClick={() => claim.mutate()}
                  disabled={claim.isPending}
                  className="shrink-0 rounded-md bg-gold px-2 py-1 text-[9px] font-semibold text-[#14100a] transition hover:bg-gold-strong disabled:opacity-50"
                >
                  {claim.isPending ? "Rolling…" : "Top up"}
                </button>
              </div>
            ) : null}
            <p className="text-[9px] leading-4 text-muted/50">
              Pick a chip and tap any square or line. Shift-click or right-click a spot to take one chip back.
            </p>
          </ControlPanel>

          <ControlPanel title="Payouts">
            <div className="space-y-1.5">
              {PAYOUT_ROWS.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-2 text-[10px]">
                  <span className="text-muted/65">{row.label}</span>
                  <span className="font-semibold tabular-nums text-gold/80">{row.odds}</span>
                </div>
              ))}
            </div>
            <p className="text-[9px] leading-4 text-muted/45">
              Single-zero wheel · 37 pockets · {game.rtp} house RTP
            </p>
          </ControlPanel>
        </div>
      }
      stage={
        <section className="surface relative overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/55">European roulette</p>
            <span
              className={
                spinning
                  ? "rounded-full border border-gold/30 bg-gold/10 px-2.5 py-1 text-[9px] font-medium text-gold"
                  : lastResult
                    ? `rounded-full border px-2.5 py-1 text-[9px] font-semibold ${COLOR_CLASSES[lastResult.color]}`
                    : "rounded-full border border-line/60 px-2.5 py-1 text-[9px] font-medium text-muted"
              }
            >
              {spinning
                ? "No more bets"
                : lastResult
                  ? `${lastResult.number} · ${lastResult.color}`
                  : "Place your bets"}
            </span>
          </div>

          <div className="space-y-5 p-5 sm:p-7">
            <div className="grid items-center gap-5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
              <RouletteWheel
                spinToken={spinToken}
                resultNumber={wheelNumber}
                spinning={spinning}
                onSpinEnd={handleSpinEnd}
              />

              <div className="rounded-2xl border border-line/55 bg-gradient-to-b from-white/[0.035] to-transparent p-4 sm:p-5">
                {spinning ? (
                  <div className="flex min-h-[150px] flex-col items-center justify-center gap-3 text-center">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-gold opacity-50" />
                      <span className="relative inline-flex size-2 rounded-full bg-gold" />
                    </span>
                    <p className="font-display text-2xl text-ink">The wheel is spinning</p>
                    <p className="max-w-[240px] text-[10px] leading-4 text-muted/55">
                      {formatCents(totalStake)} on the felt. The ball decides where it stops.
                    </p>
                  </div>
                ) : lastResult ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <span
                        className={`grid size-16 shrink-0 place-items-center rounded-full border-2 font-display text-4xl font-semibold tabular-nums shadow-[0_12px_28px_rgba(0,0,0,0.4)] ${COLOR_CLASSES[lastResult.color]}`}
                      >
                        {lastResult.number}
                      </span>
                      <div className="min-w-0">
                        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/50">Last result</p>
                        <p className="mt-1 font-display text-2xl capitalize text-ink">{lastResult.color} pocket</p>
                        <p className={`mt-0.5 text-[11px] font-semibold tabular-nums ${lastResult.totalPayoutCents > 0 ? "text-green" : "text-muted/55"}`}>
                          {lastResult.totalPayoutCents > 0
                            ? `${formatCents(lastResult.totalPayoutCents)} returned · ${lastNet >= 0 ? "+" : ""}${formatCents(lastNet)} net`
                            : "No winning position this spin"}
                        </p>
                      </div>
                    </div>

                    {lastResult.wins.length > 0 ? (
                      <div className="space-y-1.5 rounded-xl border border-green/20 bg-green/[0.05] px-3 py-2.5">
                        {lastResult.wins.slice(0, 4).map((win, index) => (
                          <div key={`${win.label}-${index}`} className="flex items-center justify-between gap-2 text-[10px]">
                            <span className="truncate text-ink/75">{win.label}</span>
                            <span className="shrink-0 font-semibold tabular-nums text-green">
                              {formatCents(win.payoutCents)}
                            </span>
                          </div>
                        ))}
                        {lastResult.wins.length > 4 ? (
                          <p className="text-[9px] text-muted/45">+{lastResult.wins.length - 4} more winning positions</p>
                        ) : null}
                      </div>
                    ) : (
                      <p className="rounded-xl border border-line/50 bg-bg/25 px-3 py-2.5 text-[10px] leading-4 text-muted/55">
                        The house collected the chips. Pick your spots for the next spin.
                      </p>
                    )}

                    <div className="flex items-center justify-between gap-2 border-t border-line/40 pt-3">
                      <p className="text-[9px] text-muted/45">{formatMultiplier(lastResult.multiplier)} return</p>
                      <button
                        type="button"
                        onClick={rebet}
                        disabled={locked || lastPlacements.length === 0}
                        className="rounded-md border border-gold/30 bg-gold/10 px-2.5 py-1 text-[9px] font-semibold text-gold transition hover:bg-gold/15 disabled:opacity-35"
                      >
                        Rebet {formatCents(totalOf(lastPlacements))}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex min-h-[150px] flex-col items-center justify-center gap-2 text-center">
                    <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gold/60">Place your bets</p>
                    <p className="font-display text-2xl text-ink">Chips on the felt</p>
                    <p className="max-w-[260px] text-[10px] leading-4 text-muted/55">
                      Choose a chip below, then tap the table. The wheel spins when you are ready.
                    </p>
                  </div>
                )}

                {recent.length > 0 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-1.5 border-t border-line/40 pt-3">
                    <span className="mr-1 text-[8px] font-semibold uppercase tracking-[0.18em] text-muted/40">Recent</span>
                    {recent.map((number, index) => {
                      const color = rouletteColor(number);
                      return (
                        <span
                          key={`recent-${number}-${index}`}
                          className={`grid size-6 place-items-center rounded-full border text-[9px] font-bold tabular-nums ${COLOR_CLASSES[color]} ${index === 0 ? "ring-1 ring-gold/50 ring-offset-1 ring-offset-[#0f1411]" : "opacity-80"}`}
                        >
                          {number}
                        </span>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-line/60 bg-[#0a0f0c] p-3">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/45">Chip rail</p>
                <p className="text-[9px] text-muted/45">
                  Selected <span className="font-semibold text-gold">{formatCents(selectedChip)}</span>
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-2.5">
                {CHIPS.map((cents) => (
                  <ChipButton
                    key={cents}
                    cents={cents}
                    selected={selectedChip === cents}
                    onClick={() => setSelectedChip(cents)}
                    disabled={locked}
                    size="sm"
                  />
                ))}
              </div>
              <div className="mt-3 sm:hidden">
                <PlayButton disabled={!canSpin || mutation.isPending} onClick={spin}>
                  {mutation.isPending || spinning ? "Spinning…" : "Spin the wheel"}
                </PlayButton>
              </div>
            </div>

            <RouletteTable
              chipsBySpot={chipsBySpot}
              disabled={locked}
              resultNumber={tableResultNumber}
              onPlace={placeChip}
              onRemove={removeChip}
            />
            <p className="text-center text-[9px] text-muted/40 sm:hidden">
              Swipe the felt sideways to reach all 12 columns.
            </p>
          </div>

          <div className="border-t border-line/60 px-5 py-3.5">
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-muted/55">
              <span>
                {spinning
                  ? "The ball is live. No more bets."
                  : settling
                    ? "Winning chips are highlighted before the table is cleared."
                    : lastResult
                      ? "Spin again or rebet the same layout."
                      : "Tap a number, split, street, corner or outside spot to place a chip."}
              </span>
              <span className="tabular-nums">
                Total on felt <span className="font-semibold text-gold">{formatCents(totalStake)}</span>
              </span>
            </div>
          </div>
        </section>
      }
    />
  );
}
