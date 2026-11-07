"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GameShell } from "@/components/games/game-shell";
import {
  BetAmountControl,
  ControlPanel,
  PlayButton,
  SegmentedControl,
  Stage,
  StatTile,
  useBetAmount,
} from "@/components/games/controls";
import { useGameResult } from "@/components/games/use-game-result";
import { getPlinkoPayouts } from "@/modules/games/instant/plinko";

type PlinkoRisk = "low" | "medium" | "high";
type PlinkoResult = { rows: number; risk: PlinkoRisk; path: number[]; bucket: number; multiplier: number };

function toneFor(value: number) {
  if (value >= 10) return "border-gold/40 bg-gold/15 text-gold";
  if (value >= 2) return "border-green/30 bg-green/10 text-green";
  if (value >= 1) return "border-line bg-surface-2 text-ink/70";
  return "border-red/25 bg-red/10 text-red/70";
}

export function PlinkoGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [rows, setRows] = useState<8 | 10 | 12 | 14 | 16>(12);
  const [risk, setRisk] = useState<PlinkoRisk>("medium");
  const [lastBet, setLastBet] = useState<PublicBet | null>(null);
  const [step, setStep] = useState(0);
  const result = useGameResult(game.name);
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
    <GameShell
      game={game}
      controls={
        <ControlPanel title="Drop settings">
          <BetAmountControl
            game={game}
            balanceCents={session.wallet.balanceCents}
            amount={amount}
            setAmount={setAmount}
            disabled={mutation.isPending || animating}
          />
          <div>
            <p className="mb-2 text-[10px] font-medium text-muted">Risk</p>
            <SegmentedControl
              value={risk}
              onChange={setRisk}
              disabled={mutation.isPending || animating}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Med" },
                { value: "high", label: "High" },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-medium text-muted">Rows</p>
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
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Top multiplier" value={formatMultiplier(maxMultiplier)} tone="text-[#edb6cc]" />
            <StatTile label="Top payout" value={formatCents(Math.floor(amountCents * maxMultiplier), { compact: true })} />
          </div>
          <PlayButton disabled={!valid || mutation.isPending || animating} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Dropping…" : animating ? "Ball in motion…" : "Drop ball"}
          </PlayButton>
        </ControlPanel>
      }
      stage={
        <Stage
          label="Plinko board"
          status={
            <span className={cn("rounded-full border px-2.5 py-1 text-[9px] font-medium", plinkoResult ? toneFor(plinkoResult.multiplier) : "border-line/60 text-muted")}>
              {plinkoResult ? `${formatMultiplier(plinkoResult.multiplier)} · ${formatCents(lastBet?.payoutCents ?? 0)}` : `${risk} risk`}
            </span>
          }
          footer={
            <div className="text-center text-[10px] text-muted/60">
              {plinkoResult && step >= plinkoResult.rows
                ? plinkoResult.multiplier >= 1
                  ? "Landed on a paying bucket."
                  : "Landed on a low bucket. The house keeps this one."
                : "Choose your risk and drop the ball."}
            </div>
          }
        >
          <div className="relative mx-auto h-[330px] w-full max-w-[620px] sm:h-[360px]">
            {Array.from({ length: rows }, (_, row) =>
              Array.from({ length: row + 2 }, (_, index) => (
                <span
                  key={`${row}-${index}`}
                  className="absolute size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-ink/25 shadow-[0_0_5px_rgba(244,241,232,0.18)] sm:size-1.5"
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
                className="absolute z-10 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold shadow-[0_0_18px_rgba(216,184,120,0.8)]"
              />
            ) : (
              <span className="absolute left-1/2 top-[4%] z-10 size-3 -translate-x-1/2 rounded-full bg-gold shadow-[0_0_18px_rgba(216,184,120,0.8)]" />
            )}
            <div className="absolute inset-x-0 bottom-0 flex gap-1">
              {multipliers.map((multiplier, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex h-9 flex-1 items-center justify-center rounded-md border text-[8px] font-semibold sm:text-[9px]",
                    toneFor(multiplier),
                    plinkoResult?.bucket === index && step >= rows ? "ring-2 ring-gold/60" : "",
                  )}
                >
                  {multiplier < 10 ? multiplier.toFixed(1) : multiplier.toFixed(0)}×
                </div>
              ))}
            </div>
          </div>
        </Stage>
      }
    />
  );
}
