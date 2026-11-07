"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, Dices, Sparkles } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { newRequestKey } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { BetAmountControl, useBetAmount } from "@/components/games/bet-controls";
import { useGameResult } from "@/components/games/use-game-result";

type DiceResult = {
  roll: number;
  threshold: number;
  direction: "over" | "under";
  chance: number;
  win: boolean;
};

export function DiceGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [direction, setDirection] = useState<"over" | "under">("under");
  const [chance, setChance] = useState(49.5);
  const [lastBet, setLastBet] = useState<PublicBet | null>(null);
  const result = useGameResult(game.id);

  const payout = 99 / chance;
  const threshold = direction === "under" ? chance : 100 - chance;

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/dice/play", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          input: { direction, chance },
          idempotencyKey: newRequestKey(),
        }),
      }),
    onSuccess: (bet) => {
      setLastBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const lastResult = lastBet?.result as DiceResult | undefined;

  const bar = useMemo(() => {
    const marker = lastResult?.roll ?? null;
    return { marker };
  }, [lastResult]);

  return (
    <GamePageLayout
      game={game}
      controls={
        <section className="surface p-4">
          <BetAmountControl
            game={game}
            balanceCents={session.wallet.balanceCents}
            amount={amount}
            setAmount={setAmount}
            disabled={mutation.isPending}
          />
          <div className="my-4 h-px bg-line/60" />
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted">Direction</p>
            <div className="flex rounded-md bg-[#0f212e] p-0.5">
              <button
                type="button"
                onClick={() => setDirection("under")}
                className={`flex h-7 items-center gap-1 rounded px-2.5 text-[10px] font-bold transition ${direction === "under" ? "bg-[#213743] text-white" : "text-muted"}`}
              >
                <ArrowDown className="size-3" /> Under
              </button>
              <button
                type="button"
                onClick={() => setDirection("over")}
                className={`flex h-7 items-center gap-1 rounded px-2.5 text-[10px] font-bold transition ${direction === "over" ? "bg-[#213743] text-white" : "text-muted"}`}
              >
                <ArrowUp className="size-3" /> Over
              </button>
            </div>
          </div>
          <div className="mt-4">
            <div className="flex items-end justify-between">
              <p className="text-[11px] font-semibold text-muted">Win chance</p>
              <p className="font-display text-lg font-bold text-white">{chance.toFixed(1)}%</p>
            </div>
            <input
              type="range"
              min={2}
              max={95}
              step={0.5}
              value={chance}
              onChange={(event) => setChance(Number(event.target.value))}
              className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[#0f212e] accent-green"
              style={{
                background: `linear-gradient(to right, #00e701 0%, #00e701 ${(chance - 2) / 0.93}%, #2f4553 ${(chance - 2) / 0.93}%, #2f4553 100%)`,
              }}
            />
            <div className="mt-2 flex justify-between text-[9px] text-muted/60">
              <span>2%</span>
              <span>95%</span>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Multiplier</p>
              <p className="mt-1 font-display text-lg font-bold text-green">{formatMultiplier(payout)}</p>
            </div>
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Profit on win</p>
              <p className="mt-1 font-display text-lg font-bold text-white">{formatCents(Math.floor(amountCents * payout) - amountCents, { compact: true })}</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {[2, 3, 5, 10].map((target) => {
              const targetChance = 99 / target;
              return (
                <button
                  key={target}
                  type="button"
                  onClick={() => setChance(Math.round(targetChance * 10) / 10)}
                  className="rounded-md border border-line/60 bg-[#0f212e] px-2.5 py-1.5 text-[9px] font-bold text-muted transition hover:border-green/30 hover:text-white"
                >
                  {target}x
                </button>
              );
            })}
          </div>
          <button
            type="button"
            className="btn btn-primary mt-4 w-full"
            disabled={!valid || mutation.isPending}
            onClick={() => mutation.mutate()}
          >
            {mutation.isPending ? "Rolling…" : `Roll ${direction} ${threshold.toFixed(2)}`}
          </button>
        </section>
      }
      stage={
        <section className="surface relative min-h-[370px] overflow-hidden p-5 sm:p-8">
          <div className="absolute -right-20 -top-24 size-72 rounded-full bg-blue/10 blur-3xl" />
          <div className="relative flex min-h-[320px] flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <Dices className="size-3.5 text-green" /> Dice
              </div>
              <div className="rounded-full border border-line/60 bg-[#0f212e]/70 px-2.5 py-1 text-[9px] font-semibold text-muted">
                {direction === "under" ? "Win if roll is under" : "Win if roll is over"} {threshold.toFixed(2)}
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center py-8">
              {lastBet && lastResult ? (
                <motion.div
                  key={lastBet.id}
                  initial={{ opacity: 0, scale: 0.85, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  transition={{ type: "spring", stiffness: 260, damping: 20 }}
                  className="text-center"
                >
                  <p className={`text-[11px] font-bold uppercase tracking-[0.18em] ${lastResult.win ? "text-green" : "text-red"}`}>
                    {lastResult.win ? "You won" : "Better luck next time"}
                  </p>
                  <p className={`mt-2 font-display text-[72px] font-bold leading-none tracking-[-0.07em] sm:text-[92px] ${lastResult.win ? "text-white" : "text-muted"}`}>
                    {lastResult.roll.toFixed(2)}
                  </p>
                  <p className={`mt-2 text-sm font-bold ${lastResult.win ? "text-green" : "text-red/80"}`}>
                    {lastResult.win ? `+${formatCents(lastBet.payoutCents - lastBet.amountCents)}` : `-${formatCents(lastBet.amountCents)}`}
                  </p>
                </motion.div>
              ) : (
                <div className="text-center">
                  <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-[#2d7fc4] to-[#0b2f4d] text-white shadow-[0_20px_60px_rgba(45,127,196,0.22)]">
                    <Dices className="size-10" strokeWidth={1.4} />
                  </div>
                  <p className="mt-5 font-display text-xl font-bold">Set your odds. Roll the dice.</p>
                  <p className="mt-1.5 text-xs text-muted">A 99% RTP original with provably fair results.</p>
                </div>
              )}
            </div>

            <div className="mt-auto">
              <div className="relative h-10 overflow-hidden rounded-lg border border-line/60 bg-[#0f212e]">
                {direction === "under" ? (
                  <>
                    <div className="absolute inset-y-0 left-0 bg-green/15" style={{ width: `${threshold}%` }} />
                    <div className="absolute inset-y-0 right-0 bg-red/10" style={{ width: `${100 - threshold}%` }} />
                  </>
                ) : (
                  <>
                    <div className="absolute inset-y-0 left-0 bg-red/10" style={{ width: `${threshold}%` }} />
                    <div className="absolute inset-y-0 right-0 bg-green/15" style={{ width: `${100 - threshold}%` }} />
                  </>
                )}
                <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] font-semibold text-muted/50">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
                {bar.marker !== null ? (
                  <motion.div
                    initial={false}
                    animate={{ left: `${bar.marker}%` }}
                    transition={{ type: "spring", stiffness: 180, damping: 22 }}
                    className="absolute inset-y-0 w-[2px] bg-white shadow-[0_0_12px_rgba(255,255,255,0.9)]"
                    style={{ left: `${bar.marker}%` }}
                  >
                    <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-white" />
                  </motion.div>
                ) : null}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-muted">
                <span>Win chance <strong className="text-white">{chance.toFixed(1)}%</strong></span>
                <span>Payout <strong className="text-green">{formatMultiplier(payout)}</strong></span>
              </div>
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Sparkles className="size-4 text-green" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Tip:</strong> lower the win chance to increase the multiplier. Cash-out is instant.
          </p>
        </div>
      }
    />
  );
}
