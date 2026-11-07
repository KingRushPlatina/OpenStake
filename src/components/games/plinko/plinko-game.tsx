"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { CircleDot, Sparkles } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { newRequestKey, cn } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { BetAmountControl, SegmentedControl, useBetAmount } from "@/components/games/bet-controls";
import { useGameResult } from "@/components/games/use-game-result";
import { getPlinkoPayouts } from "@/modules/games/instant/plinko";

type PlinkoRisk = "low" | "medium" | "high";
type PlinkoResult = { rows: number; risk: PlinkoRisk; path: number[]; bucket: number; multiplier: number };

function multiplierTone(value: number) {
  if (value >= 10) return "bg-[#ff4d4d]/18 text-[#ff8585] border-[#ff4d4d]/25";
  if (value >= 2) return "bg-[#ffb800]/15 text-[#ffd166] border-[#ffb800]/25";
  if (value >= 1) return "bg-[#4ea5ff]/12 text-[#8fc6ff] border-[#4ea5ff]/20";
  return "bg-[#ff4d4d]/10 text-[#ff8f8f] border-[#ff4d4d]/15";
}

export function PlinkoGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [rows, setRows] = useState<8 | 10 | 12 | 14 | 16>(12);
  const [risk, setRisk] = useState<PlinkoRisk>("medium");
  const [lastBet, setLastBet] = useState<PublicBet | null>(null);
  const [step, setStep] = useState(0);
  const result = useGameResult(game.id);
  const multipliers = useMemo(() => getPlinkoPayouts(rows, risk), [rows, risk]);
  const maxMultiplier = Math.max(...multipliers);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/plinko/play", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          input: { rows, risk },
          idempotencyKey: newRequestKey(),
        }),
      }),
    onSuccess: (bet) => {
      setStep(0);
      setLastBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const plinkoResult = lastBet?.result as PlinkoResult | undefined;

  useEffect(() => {
    if (!plinkoResult) return;
    const timer = window.setInterval(() => {
      setStep((current) => {
        if (current >= plinkoResult.rows) {
          window.clearInterval(timer);
          return current;
        }
        return current + 1;
      });
    }, 85);
    return () => window.clearInterval(timer);
  }, [plinkoResult]);

  const animating = Boolean(plinkoResult && step < plinkoResult.rows);
  const ballPosition = useMemo(() => {
    if (!plinkoResult) return { left: 50, top: 8 };
    const safeStep = Math.min(step, plinkoResult.rows);
    const rightCount = plinkoResult.path.slice(0, safeStep).filter((direction) => direction === 1).length;
    return {
      left: ((rightCount + 0.5) / (safeStep + 1)) * 100,
      top: 8 + (safeStep / (plinkoResult.rows + 1)) * 84,
    };
  }, [plinkoResult, step]);

  return (
    <GamePageLayout
      game={game}
      controls={
        <section className="surface p-4">
          <BetAmountControl game={game} balanceCents={session.wallet.balanceCents} amount={amount} setAmount={setAmount} disabled={mutation.isPending || animating} />
          <div className="my-4 h-px bg-line/60" />
          <p className="mb-2 text-[11px] font-semibold text-muted">Risk</p>
          <SegmentedControl
            value={risk}
            onChange={setRisk}
            disabled={mutation.isPending || animating}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
          <p className="mb-2 mt-4 text-[11px] font-semibold text-muted">Rows</p>
          <SegmentedControl
            value={String(rows) as "8" | "10" | "12" | "14" | "16"}
            onChange={(value) => setRows(Number(value) as 8 | 10 | 12 | 14 | 16)}
            disabled={mutation.isPending || animating}
            options={[
              { value: "8", label: "8" },
              { value: "10", label: "10" },
              { value: "12", label: "12" },
              { value: "14", label: "14" },
              { value: "16", label: "16" },
            ]}
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Max multiplier</p>
              <p className="mt-1 font-display text-lg font-bold text-pink">{formatMultiplier(maxMultiplier)}</p>
            </div>
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Max payout</p>
              <p className="mt-1 font-display text-lg font-bold text-white">{formatCents(Math.floor(amountCents * maxMultiplier), { compact: true })}</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary mt-4 w-full" disabled={!valid || mutation.isPending || animating} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Dropping…" : animating ? "Ball in motion…" : "Drop ball"}
          </button>
        </section>
      }
      stage={
        <section className="surface relative min-h-[430px] overflow-hidden p-4 sm:p-6">
          <div className="absolute left-1/2 top-0 size-72 -translate-x-1/2 rounded-full bg-pink/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <CircleDot className="size-3.5 text-pink" /> Plinko
              </div>
              {lastBet && plinkoResult ? (
                <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", multiplierTone(plinkoResult.multiplier))}>
                  {formatMultiplier(plinkoResult.multiplier)} · {formatCents(lastBet.payoutCents)}
                </div>
              ) : (
                <div className="rounded-full border border-line/60 bg-[#0f212e]/70 px-2.5 py-1 text-[9px] font-semibold text-muted">Risk {risk}</div>
              )}
            </div>

            <div className="relative mx-auto mt-5 h-[330px] w-full max-w-[620px] sm:h-[360px]">
              {Array.from({ length: rows }, (_, row) =>
                Array.from({ length: row + 2 }, (_, index) => (
                  <span
                    key={`${row}-${index}`}
                    className="absolute size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/55 shadow-[0_0_5px_rgba(255,255,255,0.35)] sm:size-1.5"
                    style={{
                      left: `${((index + 0.5) / (row + 2)) * 100}%`,
                      top: `${8 + ((row + 0.55) / (rows + 1)) * 76}%`,
                    }}
                  />
                )),
              )}
              {plinkoResult ? (
                <motion.span
                  animate={{ left: `${ballPosition.left}%`, top: `${ballPosition.top}%` }}
                  transition={{ duration: 0.08, ease: "linear" }}
                  className="absolute z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#ff6ea9] shadow-[0_0_18px_#ff6ea9]"
                />
              ) : (
                <span className="absolute left-1/2 top-[4%] z-10 size-3 -translate-x-1/2 rounded-full bg-[#ff6ea9] shadow-[0_0_18px_#ff6ea9]" />
              )}
              <div className="absolute inset-x-0 bottom-0 flex gap-1">
                {multipliers.map((multiplier, index) => (
                  <div
                    key={index}
                    className={cn(
                      "flex h-9 flex-1 items-center justify-center rounded-md border text-[8px] font-bold sm:text-[9px]",
                      multiplierTone(multiplier),
                      plinkoResult?.bucket === index && step >= rows ? "ring-2 ring-white/60" : "",
                    )}
                  >
                    {multiplier < 10 ? multiplier.toFixed(1) : multiplier.toFixed(0)}×
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted">
              {lastBet && plinkoResult && step >= plinkoResult.rows ? (
                <>
                  <Sparkles className={cn("size-3", lastBet.payoutCents > lastBet.amountCents ? "text-pink" : "text-muted")} />
                  <span>
                    {lastBet.payoutCents > lastBet.amountCents ? "Landed on a winner" : "Landed on a low bucket"} ·{" "}
                    <strong className={lastBet.payoutCents > lastBet.amountCents ? "text-green" : "text-muted"}>
                      {formatCents(lastBet.payoutCents)}
                    </strong>
                  </span>
                </>
              ) : (
                <span>Choose your risk and drop the ball.</span>
              )}
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Sparkles className="size-4 text-pink" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Plinko:</strong> more rows create more buckets and a smoother payout curve.
          </p>
        </div>
      }
    />
  );
}
