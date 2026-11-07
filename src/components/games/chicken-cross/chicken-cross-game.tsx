"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bird, Car, ChevronsRight, Sparkles } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { BetAmountControl, SegmentedControl, useBetAmount } from "@/components/games/bet-controls";
import { useGameResult } from "@/components/games/use-game-result";
import { useProgressionBet } from "@/components/games/use-progression-bet";

type Difficulty = "easy" | "medium" | "hard" | "expert";
type ChickenPublic = {
  difficulty: Difficulty;
  lanes: number;
  currentLane: number;
  multiplier: number;
  nextMultiplier: number;
  levelMultipliers: number[];
  cashoutAllowed: boolean;
  deathLane?: number | null;
  lost?: boolean;
};

export function ChickenCrossGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const { activeBet, setActiveBet } = useProgressionBet(game.id);
  const result = useGameResult(game.id);
  const state = activeBet?.result as ChickenPublic | undefined;
  const isActive = activeBet?.status === "active";
  const settled = activeBet?.status === "settled";

  const start = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/chicken-cross/start", {
        method: "POST",
        body: JSON.stringify({ amountCents, input: { difficulty }, idempotencyKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const act = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>(`/api/games/chicken-cross/${activeBet?.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: { type: "cross" }, actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const cashout = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>(`/api/games/chicken-cross/${activeBet?.id}/cashout`, {
        method: "POST",
        body: JSON.stringify({ actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const busy = start.isPending || act.isPending || cashout.isPending;
  const multiplier = state?.multiplier ?? 1;
  const potential = Math.floor((activeBet?.amountCents ?? amountCents) * multiplier);
  const lanes = state?.lanes ?? 12;
  const currentLane = state?.currentLane ?? 0;
  const deathLane = state?.deathLane;

  return (
    <GamePageLayout
      game={game}
      controls={
        <section className="surface p-4">
          <BetAmountControl game={game} balanceCents={session.wallet.balanceCents} amount={amount} setAmount={setAmount} disabled={isActive || busy} />
          <div className="my-4 h-px bg-line/60" />
          <p className="mb-2 text-[11px] font-semibold text-muted">Traffic</p>
          <SegmentedControl
            value={difficulty}
            onChange={setDifficulty}
            disabled={isActive || busy}
            options={[
              { value: "easy", label: "Easy" },
              { value: "medium", label: "Med" },
              { value: "hard", label: "Hard" },
              { value: "expert", label: "Expert" },
            ]}
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Multiplier</p>
              <p className="mt-1 font-display text-lg font-bold text-amber">{formatMultiplier(multiplier)}</p>
            </div>
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Cashout</p>
              <p className="mt-1 font-display text-lg font-bold text-white">{formatCents(potential)}</p>
            </div>
          </div>
          {isActive ? (
            <button type="button" className="btn btn-primary mt-4 w-full" disabled={!state?.cashoutAllowed || busy} onClick={() => cashout.mutate()}>
              {busy ? "Settling…" : `Cash out ${formatCents(potential)}`}
            </button>
          ) : (
            <button type="button" className="btn btn-primary mt-4 w-full" disabled={!valid || busy} onClick={() => start.mutate()}>
              {busy ? "Starting…" : settled ? "Cross again" : "Start crossing"}
            </button>
          )}
          <p className="mt-3 text-center text-[10px] leading-4 text-muted/65">
            {isActive ? "Cross one lane at a time. Traffic is unforgiving." : "Each lane is a new risk. Cash out before the road wins."}
          </p>
        </section>
      }
      stage={
        <section className="surface relative min-h-[500px] overflow-hidden p-4 sm:p-6">
          <div className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/[0.06] blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <Bird className="size-3.5 text-amber" /> Chicken Cross
              </div>
              <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", isActive ? "border-amber/30 bg-amber/10 text-amber" : settled ? (state?.lost ? "border-red/30 bg-red/10 text-red" : "border-green/30 bg-green/10 text-green") : "border-line/60 bg-[#0f212e] text-muted")}>
                {isActive ? `Lane ${currentLane}/${lanes}` : settled ? (state?.lost ? "Traffic hit" : "Safely across") : `${lanes} lanes`}
              </div>
            </div>

            <div className="mx-auto mt-8 max-w-[620px]">
              <div className="relative flex items-center gap-1 rounded-2xl border border-line/50 bg-[#1a2c38] p-2">
                {Array.from({ length: lanes }, (_, lane) => {
                  const crossed = lane < currentLane;
                  const current = isActive && lane === currentLane;
                  const fatal = settled && deathLane === lane;
                  return (
                    <div key={lane} className="relative flex-1">
                      <div
                        className={cn(
                          "flex h-16 flex-col items-center justify-center rounded-md border text-[8px] font-bold transition sm:h-20",
                          fatal
                            ? "border-red/50 bg-red/15 text-red"
                            : crossed
                              ? "border-green/30 bg-green/[0.08] text-green"
                              : current
                                ? "border-amber/50 bg-amber/[0.08] text-amber"
                                : "border-line/40 bg-[#0f212e] text-muted/40",
                        )}
                      >
                        {fatal ? <Car className="size-4" /> : lane === currentLane && isActive ? <Bird className="size-4" /> : lane + 1}
                      </div>
                      <p className="mt-1 text-center text-[7px] text-muted/50">{formatMultiplier(state?.levelMultipliers?.[lane + 1] ?? 1)}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-5 flex items-center justify-between rounded-xl border border-line/50 bg-[#0f212e] px-4 py-3">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-muted/55">Current value</p>
                  <p className="mt-0.5 font-display text-xl font-bold text-white">{formatCents(potential)}</p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider text-muted/55">Next step</p>
                  <p className="mt-0.5 font-display text-xl font-bold text-amber">{formatMultiplier(state?.nextMultiplier ?? 1)}</p>
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!isActive || busy}
                  onClick={() => act.mutate()}
                  className="btn btn-primary h-14 text-sm disabled:opacity-35"
                >
                  <ChevronsRight className="size-4" /> Cross lane
                </button>
                <button
                  type="button"
                  disabled={!isActive || !state?.cashoutAllowed || busy}
                  onClick={() => cashout.mutate()}
                  className="btn btn-secondary h-14 text-sm disabled:opacity-35"
                >
                  Cash out {formatCents(potential)}
                </button>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted">
                <Sparkles className="size-3 text-amber" />
                {isActive ? "A single bad lane ends the run." : settled ? "The road is clear. Start again." : "Start the run and time your cashout."}
              </div>
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Bird className="size-4 text-amber" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Chicken Cross:</strong> cash out before traffic catches the chicken.
          </p>
        </div>
      }
    />
  );
}
