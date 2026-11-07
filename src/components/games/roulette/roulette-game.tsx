"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { CircleDashed, RotateCcw, Sparkles } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { useGameResult } from "@/components/games/use-game-result";
import {
  getRouletteSpots,
  rouletteColor,
  rouletteLabel,
  type RouletteSpot,
  type RouletteVariant,
} from "@/modules/games/instant/roulette";
import { RouletteWheel, rouletteWheelOrder } from "./roulette-wheel";

type RouletteResult = {
  variant: RouletteVariant;
  winner: number;
  winnerLabel: string;
  color: string;
  bets: { spotId: string; label: string; amountCents: number; won: boolean; payoutCents: number }[];
  totalBet: number;
  totalPayout: number;
};

const CHIPS = [1, 5, 25, 100];

export function RouletteGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const [variant, setVariant] = useState<RouletteVariant>("european");
  const [chip, setChip] = useState(5);
  const [chipHistory, setChipHistory] = useState<{ spotId: string; amountCents: number }[]>([]);
  const [lastBet, setLastBet] = useState<PublicBet | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [recent, setRecent] = useState<{ winner: number; variant: RouletteVariant }[]>([]);
  const timeout = useRef<number | undefined>(undefined);
  const result = useGameResult(game.id);

  const spots = useMemo(() => getRouletteSpots(variant), [variant]);
  const spotsById = useMemo(() => new Map(spots.map((spot) => [spot.id, spot])), [spots]);
  const bets = useMemo(() => {
    const totals: Record<string, number> = {};
    for (const entry of chipHistory) totals[entry.spotId] = (totals[entry.spotId] ?? 0) + entry.amountCents;
    return totals;
  }, [chipHistory]);
  const totalBet = Object.values(bets).reduce((sum, value) => sum + value, 0);
  const valid = totalBet >= game.minBetCents && totalBet <= game.maxBetCents;
  const rouletteResult = lastBet?.result as RouletteResult | undefined;

  const spin = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/roulette/play", {
        method: "POST",
        body: JSON.stringify({
          amountCents: totalBet,
          input: {
            variant,
            bets: Object.entries(bets).map(([spotId, amountCents]) => ({ spotId, amountCents })),
          },
          idempotencyKey: newRequestKey(),
        }),
      }),
    onSuccess: (bet) => {
      setLastBet(bet);
      result.onResult(bet);
      const payload = bet.result as RouletteResult;
      const order = rouletteWheelOrder[payload.variant];
      const angle = 360 / order.length;
      const index = Math.max(0, order.indexOf(payload.winner));
      const required = 360 - ((index * angle + angle / 2) % 360);
      setRotation((current) => current + 1800 + ((required - (current % 360) + 360) % 360));
      setSpinning(true);
      setRecent((current) => [{ winner: payload.winner, variant: payload.variant }, ...current].slice(0, 12));
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => setSpinning(false), 4300);
    },
    onError: result.onError,
  });

  const addChip = (spotId: string) => {
    if (spinning || spin.isPending) return;
    if (totalBet + chip * 100 > game.maxBetCents) return;
    setChipHistory((current) => [...current, { spotId, amountCents: chip * 100 }]);
  };

  const changeVariant = (next: RouletteVariant) => {
    if (spinning) return;
    setVariant(next);
    setChipHistory([]);
    setLastBet(null);
  };

  const badge = (spotId: string) =>
    bets[spotId] ? (
      <span className="pointer-events-none absolute right-0.5 top-0.5 z-10 min-w-3 rounded-full bg-[#ffb800] px-1 py-0.5 text-[7px] font-black leading-none text-[#1a1200]">
        {formatCents(bets[spotId], { compact: true }).replace("$", "")}
      </span>
    ) : null;

  const numberButton = (spot: RouletteSpot) => {
    const color = rouletteColor(spot.numbers[0]);
    return (
      <button
        key={spot.id}
        type="button"
        onClick={() => addChip(spot.id)}
        disabled={spinning || spin.isPending}
        className={cn(
          "relative flex h-8 flex-1 items-center justify-center border border-[#0b141b]/50 text-[10px] font-bold text-white transition hover:brightness-125 sm:h-9",
          color === "red" ? "bg-[#b73947]" : color === "black" ? "bg-[#192833]" : "bg-[#1b8a52]",
          rouletteResult?.winner === spot.numbers[0] && !spinning ? "ring-2 ring-inset ring-white/80" : "",
        )}
      >
        {spot.label}
        {badge(spot.id)}
      </button>
    );
  };

  return (
    <GamePageLayout
      game={game}
      wide
      controls={
        <section className="surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted">Chip value</p>
            <span className="text-[10px] text-muted/60">Balance {formatCents(session.wallet.balanceCents)}</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {CHIPS.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setChip(value)}
                disabled={spinning || spin.isPending}
                className={cn(
                  "flex h-11 flex-col items-center justify-center rounded-full border text-[10px] font-black transition disabled:opacity-40",
                  chip === value ? "border-amber bg-amber/15 text-amber" : "border-line/60 bg-[#0f212e] text-muted hover:text-white",
                )}
              >
                <span className="text-[8px]">$</span>
                {value}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-1.5">
            {(["european", "american"] as RouletteVariant[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => changeVariant(option)}
                disabled={spinning}
                className={cn(
                  "h-8 rounded-md border text-[10px] font-bold capitalize transition disabled:opacity-40",
                  variant === option ? "border-red/50 bg-red/10 text-red" : "border-line/60 bg-[#0f212e] text-muted hover:text-white",
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="mt-4 rounded-lg bg-[#0f212e] p-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted">Total on table</span>
              <span className="font-display text-lg font-bold text-white">{formatCents(totalBet)}</span>
            </div>
            <p className="mt-1 text-[9px] text-muted/55">{chipHistory.length} chips placed</p>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={chipHistory.length === 0 || spinning || spin.isPending}
              onClick={() => setChipHistory((current) => current.slice(0, -1))}
              className="btn btn-secondary h-9 text-[10px]"
            >
              Undo
            </button>
            <button
              type="button"
              disabled={chipHistory.length === 0 || spinning || spin.isPending}
              onClick={() => setChipHistory([])}
              className="btn btn-secondary h-9 gap-1 text-[10px]"
            >
              <RotateCcw className="size-3" /> Clear
            </button>
          </div>
          <button type="button" className="btn btn-primary mt-3 w-full" disabled={!valid || spinning || spin.isPending} onClick={() => spin.mutate()}>
            {spinning ? "Spinning…" : spin.isPending ? "Placing chips…" : "Spin roulette"}
          </button>
          {!valid && totalBet > 0 ? <p className="mt-2 text-[10px] text-red">Total bet must be between {formatCents(game.minBetCents)} and {formatCents(game.maxBetCents)}.</p> : null}
          <div className="mt-4">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted/55">Recent numbers</p>
            <div className="mt-2 flex flex-wrap gap-1">
              {recent.length === 0 ? <span className="text-[10px] text-muted/50">No spins yet</span> : recent.map((entry, index) => (
                <span
                  key={`${entry.winner}-${index}`}
                  className={cn(
                    "grid size-6 place-items-center rounded-full text-[9px] font-bold text-white",
                    rouletteColor(entry.winner) === "red" ? "bg-[#b73947]" : rouletteColor(entry.winner) === "black" ? "bg-[#192833]" : "bg-[#1b8a52]",
                  )}
                >
                  {rouletteLabel(entry.winner)}
                </span>
              ))}
            </div>
          </div>
        </section>
      }
      stage={
        <section className="surface relative overflow-hidden p-4 sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_35%_10%,rgba(105,73,22,0.14),transparent_45%)]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <CircleDashed className="size-3.5 text-red" /> Roulette
              </div>
              <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", rouletteResult && !spinning ? "border-amber/30 bg-amber/10 text-amber" : "border-line/60 bg-[#0f212e] text-muted")}>
                {rouletteResult && !spinning ? `${rouletteResult.winnerLabel} ${rouletteResult.color} · ${formatCents(lastBet?.payoutCents ?? 0)}` : variant === "european" ? "Single zero" : "Double zero"}
              </div>
            </div>

            <div className="mt-4 grid items-center gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <RouletteWheel variant={variant} winner={rouletteResult?.winner ?? null} rotation={rotation} />
              <div className="order-first lg:order-last">
                <div className="rounded-xl border border-line/50 bg-[#0f212e]/60 p-4">
                  <p className="text-[9px] uppercase tracking-wider text-muted/55">Last result</p>
                  {rouletteResult && !spinning ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2 flex items-center gap-3">
                      <span className={cn("grid size-14 place-items-center rounded-full font-display text-2xl font-bold text-white", rouletteResult.color === "red" ? "bg-[#b73947]" : rouletteResult.color === "black" ? "bg-[#192833]" : "bg-[#1b8a52]")}>
                        {rouletteResult.winnerLabel}
                      </span>
                      <div>
                        <p className="text-xs font-bold text-white">{formatCents(lastBet?.payoutCents ?? 0)} payout</p>
                        <p className="mt-0.5 text-[10px] text-muted">
                          {lastBet && lastBet.payoutCents > lastBet.amountCents ? `+${formatCents(lastBet.payoutCents - lastBet.amountCents)} profit` : "No winning chips"}
                        </p>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="mt-2 flex items-center gap-2 text-[11px] text-muted">
                      {spinning ? <CircleDashed className="size-4 animate-spin text-amber" /> : <Sparkles className="size-4 text-muted/60" />}
                      {spinning ? "The ball is rolling…" : "Place chips on the table."}
                    </div>
                  )}
                </div>
                <div className="mt-3 rounded-xl border border-line/50 bg-[#0f212e]/60 p-4">
                  <p className="text-[9px] uppercase tracking-wider text-muted/55">Payouts</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                    <span className="text-muted">Straight</span><span className="text-right font-semibold text-white">35:1</span>
                    <span className="text-muted">Dozen / column</span><span className="text-right font-semibold text-white">2:1</span>
                    <span className="text-muted">Red / black</span><span className="text-right font-semibold text-white">1:1</span>
                    <span className="text-muted">Odd / even</span><span className="text-right font-semibold text-white">1:1</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-5 overflow-x-auto pb-1">
              <div className="min-w-[620px]">
                <div className="flex gap-1">
                  <div className="flex w-11 flex-col gap-1">
                    {spots.filter((spot) => spot.kind === "straight" && (spot.numbers[0] === 0 || spot.numbers[0] === 37)).map((spot) => (
                      <button
                        key={spot.id}
                        type="button"
                        onClick={() => addChip(spot.id)}
                        disabled={spinning || spin.isPending}
                        className="relative flex flex-1 items-center justify-center rounded-sm bg-[#1b8a52] text-[11px] font-bold text-white ring-offset-2 hover:brightness-110"
                      >
                        {spot.label}
                        {badge(spot.id)}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-1 gap-1">
                    {Array.from({ length: 12 }, (_, column) => (
                      <div key={column} className="flex flex-1 flex-col gap-1">
                        {[column * 3 + 3, column * 3 + 2, column * 3 + 1].map((number) => {
                          const spot = spotsById.get(`straight-${number}`);
                          return spot ? numberButton(spot) : null;
                        })}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-1 grid grid-cols-3 gap-1">
                  {["dozen-1", "dozen-2", "dozen-3"].map((id) => {
                    const spot = spotsById.get(id);
                    return spot ? (
                      <button key={id} type="button" onClick={() => addChip(id)} disabled={spinning || spin.isPending} className="relative h-9 rounded-sm border border-line/60 bg-[#142a36] text-[10px] font-bold text-muted hover:text-white">
                        {spot.label}
                        {badge(id)}
                      </button>
                    ) : null;
                  })}
                </div>
                <div className="mt-1 grid grid-cols-6 gap-1">
                  {["low", "even", "red", "black", "odd", "high"].map((id) => {
                    const spot = spotsById.get(id);
                    return spot ? (
                      <button key={id} type="button" onClick={() => addChip(id)} disabled={spinning || spin.isPending} className="relative h-9 rounded-sm border border-line/60 bg-[#142a36] text-[10px] font-bold text-muted hover:text-white">
                        {spot.label}
                        {badge(id)}
                      </button>
                    ) : null;
                  })}
                </div>
                <div className="mt-1 grid grid-cols-3 gap-1">
                  {["column-1", "column-2", "column-3"].map((id) => {
                    const spot = spotsById.get(id);
                    return spot ? (
                      <button key={id} type="button" onClick={() => addChip(id)} disabled={spinning || spin.isPending} className="relative h-8 rounded-sm border border-line/60 bg-[#142a36] text-[9px] font-bold text-muted hover:text-white">
                        {spot.label} · 2:1
                        {badge(id)}
                      </button>
                    ) : null;
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <CircleDashed className="size-4 text-red" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Roulette:</strong> place as many chips as you like, then spin once.
          </p>
        </div>
      }
    />
  );
}
