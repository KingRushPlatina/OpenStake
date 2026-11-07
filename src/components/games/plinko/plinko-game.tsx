"use client";

import { useCallback, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
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
import { PlinkoBoard, type PlinkoBallData } from "./plinko-board";

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
  const [balls, setBalls] = useState<PlinkoBallData[]>([]);
  const result = useGameResult(game.name);
  const multipliers = useMemo(() => getPlinkoPayouts(rows, risk), [rows, risk]);
  const maxMultiplier = Math.max(...multipliers);
  const inPlay = balls.length > 0;

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
      const outcome = bet.result as PlinkoResult;
      setLastBet(bet);
      setBalls((current) => [
        ...current,
        {
          id: bet.id,
          rows: outcome.rows,
          path: outcome.path,
          multiplier: bet.multiplier,
          payoutCents: bet.payoutCents,
          stakeCents: bet.amountCents,
        },
      ]);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const handleBallLanded = useCallback((ball: PlinkoBallData) => {
    setBalls((current) => current.map((item) => (item.id === ball.id ? { ...item, landed: true } : item)));
    window.setTimeout(() => {
      setBalls((current) => current.filter((item) => item.id !== ball.id));
    }, 1500);
  }, []);

  const plinkoResult = lastBet?.result as PlinkoResult | undefined;
  const locked = mutation.isPending || inPlay;
  const hasFallingBall = balls.some((ball) => !ball.landed);

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
            disabled={locked}
          />
          <div>
            <p className="mb-2 text-[10px] font-medium text-muted">Risk</p>
            <SegmentedControl
              value={risk}
              onChange={(value) => {
                setRisk(value);
                setLastBet(null);
              }}
              disabled={locked}
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
              onChange={(value) => {
                setRows(Number(value) as 8 | 10 | 12 | 14 | 16);
                setLastBet(null);
              }}
              disabled={locked}
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
          <PlayButton disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Dropping…" : "Drop ball"}
          </PlayButton>
          <p className="text-center text-[9px] leading-4 text-muted/50">
            {inPlay ? "Balls in play. Drop another one whenever you like." : "Drop as many balls as you like, one bet per ball."}
          </p>
        </ControlPanel>
      }
      stage={
        <Stage
          label="Plinko board"
          status={
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[9px] font-medium tabular-nums",
                hasFallingBall
                  ? "border-gold/30 bg-gold/10 text-gold"
                  : plinkoResult
                    ? toneFor(plinkoResult.multiplier)
                    : "border-line/60 text-muted",
              )}
            >
              {hasFallingBall
                ? `${balls.filter((ball) => !ball.landed).length} in play`
                : plinkoResult
                  ? `${formatMultiplier(plinkoResult.multiplier)} · ${formatCents(lastBet?.payoutCents ?? 0)}`
                  : `${risk} risk`}
            </span>
          }
          footer={
            <div className="text-center text-[10px] text-muted/60">
              {hasFallingBall
                ? "The ball bounces peg by peg. Watch the bucket."
                : plinkoResult
                  ? plinkoResult.multiplier >= 1
                    ? "Landed on a paying bucket."
                    : "Landed on a low bucket. The house keeps this one."
                  : "Choose your risk and drop the ball."}
            </div>
          }
        >
          <PlinkoBoard rows={rows} multipliers={multipliers} balls={balls} onBallLanded={handleBallLanded} />
        </Stage>
      }
    />
  );
}
