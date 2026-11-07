"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Bomb, Gem, Sparkles } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { BetAmountControl, useBetAmount } from "@/components/games/bet-controls";
import { useGameResult } from "@/components/games/use-game-result";
import { useProgressionBet } from "@/components/games/use-progression-bet";

type MinesPublic = {
  mineCount: number;
  revealed: number[];
  multiplier: number;
  nextMultiplier: number;
  picks: number;
  cashoutAllowed: boolean;
  mineTiles?: number[];
  lost?: boolean;
};

const MINE_PRESETS = [1, 3, 5, 10, 24];

export function MinesGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [mineCount, setMineCount] = useState(3);
  const { activeBet, setActiveBet } = useProgressionBet(game.id);
  const result = useGameResult(game.id);
  const state = activeBet?.result as MinesPublic | undefined;
  const isActive = activeBet?.status === "active";
  const settled = activeBet?.status === "settled";
  const revealSet = new Set(state?.revealed ?? []);
  const mineSet = new Set(state?.mineTiles ?? []);
  const showMines = settled;

  const start = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/mines/start", {
        method: "POST",
        body: JSON.stringify({ amountCents, input: { mines: mineCount }, idempotencyKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const reveal = useMutation({
    mutationFn: (tile: number) =>
      apiFetch<PublicBet>(`/api/games/mines/${activeBet?.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: { type: "reveal", tile }, actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const cashout = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>(`/api/games/mines/${activeBet?.id}/cashout`, {
        method: "POST",
        body: JSON.stringify({ actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const multiplier = state?.multiplier ?? 1;
  const previewNext = Math.floor((0.99 * 25 / (25 - mineCount)) * 10_000) / 10_000;
  const nextMultiplier = state?.nextMultiplier ?? previewNext;
  const potential = Math.floor((activeBet?.amountCents ?? amountCents) * multiplier);
  const busy = start.isPending || reveal.isPending || cashout.isPending;

  return (
    <GamePageLayout
      game={game}
      controls={
        <section className="surface p-4">
          <BetAmountControl game={game} balanceCents={session.wallet.balanceCents} amount={amount} setAmount={setAmount} disabled={isActive || busy} />
          <div className="my-4 h-px bg-line/60" />
          <p className="mb-2 text-[11px] font-semibold text-muted">Mines</p>
          <div className="grid grid-cols-5 gap-1.5">
            {MINE_PRESETS.map((count) => (
              <button
                key={count}
                type="button"
                disabled={isActive || busy}
                onClick={() => setMineCount(count)}
                className={cn(
                  "h-8 rounded-md border text-[10px] font-bold transition disabled:opacity-40",
                  mineCount === count ? "border-cyan/50 bg-cyan/10 text-cyan" : "border-line/60 bg-[#0f212e] text-muted hover:text-white",
                )}
              >
                {count}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Current</p>
              <p className="mt-1 font-display text-lg font-bold text-cyan">{formatMultiplier(multiplier)}</p>
            </div>
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Next pick</p>
              <p className="mt-1 font-display text-lg font-bold text-white">{formatMultiplier(nextMultiplier)}</p>
            </div>
          </div>
          {isActive ? (
            <button
              type="button"
              className="btn btn-primary mt-4 w-full"
              disabled={!state?.cashoutAllowed || busy}
              onClick={() => cashout.mutate()}
            >
              {busy ? "Settling…" : `Cash out ${formatCents(potential)}`}
            </button>
          ) : (
            <button type="button" className="btn btn-primary mt-4 w-full" disabled={!valid || busy} onClick={() => start.mutate()}>
              {busy ? "Starting…" : settled ? "Play again" : "Start round"}
            </button>
          )}
          <p className="mt-3 text-center text-[10px] text-muted/65">
            {isActive ? "Reveal a gem to raise the multiplier." : "Pick a mine count, then start the round."}
          </p>
        </section>
      }
      stage={
        <section className="surface relative min-h-[480px] overflow-hidden p-4 sm:p-6">
          <div className="absolute left-1/2 top-1/2 size-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/[0.07] blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <Bomb className="size-3.5 text-cyan" /> Mines
              </div>
              <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", isActive ? "border-cyan/30 bg-cyan/10 text-cyan" : "border-line/60 bg-[#0f212e] text-muted")}>
                {isActive ? `${state?.picks ?? 0} gems · ${formatMultiplier(multiplier)}` : settled ? (state?.lost ? "Mine hit" : "Cashed out") : `${mineCount} mines`}
              </div>
            </div>

            <div className="mx-auto mt-5 grid max-w-[520px] grid-cols-5 gap-2 sm:gap-3">
              {Array.from({ length: 25 }, (_, index) => {
                const revealed = revealSet.has(index);
                const mine = mineSet.has(index);
                const lose = settled && state?.lost && mine;
                              return (
                  <motion.button
                    key={index}
                    type="button"
                    whileHover={isActive && !revealed ? { scale: 1.03 } : undefined}
                    whileTap={isActive && !revealed ? { scale: 0.97 } : undefined}
                    disabled={!isActive || revealed || busy}
                    onClick={() => reveal.mutate(index)}
                    className={cn(
                      "relative grid aspect-square place-items-center overflow-hidden rounded-xl border text-2xl transition",
                      revealed && mine
                        ? "border-red/50 bg-red/15 text-red"
                        : revealed
                          ? "border-cyan/40 bg-cyan/10 text-cyan"
                          : isActive
                            ? "border-line/60 bg-[#0f212e] hover:border-cyan/40 hover:bg-[#142a36]"
                            : "border-line/40 bg-[#0f212e]",
                      lose && "bg-red/20",
                    )}
                  >
                    {revealed && mine ? <Bomb className="size-6 sm:size-7" /> : revealed ? <Gem className="size-6 sm:size-7" /> : showMines && mine ? <Bomb className="size-5 text-red/60" /> : <span className="size-1.5 rounded-full bg-white/10" />}
                  </motion.button>
                );
              })}
            </div>

            <div className="mx-auto mt-5 max-w-[520px]">
              <div className="flex items-center justify-between text-[10px] text-muted">
                <span>Potential cashout</span>
                <span className="font-bold text-white">{formatCents(potential)}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#0f212e]">
                <motion.div
                  className="h-full rounded-full bg-gradient-to-r from-cyan to-green"
                  animate={{ width: `${Math.min(100, ((state?.picks ?? 0) / Math.max(1, 25 - mineCount)) * 100)}%` }}
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-muted">
              <Sparkles className="size-3 text-cyan" />
              {isActive ? "One wrong tile ends the round." : settled ? "The board is revealed. Start a new round." : "Choose your risk and start."}
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Gem className="size-4 text-cyan" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Mines:</strong> each safe gem raises your cashout value. Cash out before you hit a mine.
          </p>
        </div>
      }
    />
  );
}
