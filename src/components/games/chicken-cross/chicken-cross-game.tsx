"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Bird, Car, ChevronsRight } from "lucide-react";
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
  const result = useGameResult(game.name);
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
    mutationFn: (action: { type: "cross" } | { type: "cashout" }) =>
      apiFetch<PublicBet>(`/api/games/chicken-cross/${activeBet?.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action, actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const busy = start.isPending || act.isPending;
  const multiplier = state?.multiplier ?? 1;
  const potential = Math.floor((activeBet?.amountCents ?? amountCents) * multiplier);
  const lanes = state?.lanes ?? 12;
  const currentLane = state?.currentLane ?? 0;
  const deathLane = state?.deathLane;

  return (
    <GameShell
      game={game}
      controls={
        <ControlPanel title="Road settings">
          <BetAmountControl
            game={game}
            balanceCents={session.wallet.balanceCents}
            amount={amount}
            setAmount={setAmount}
            disabled={isActive || busy}
          />
          <div>
            <p className="mb-2 text-[10px] font-medium text-muted">Traffic</p>
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
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Multiplier" value={formatMultiplier(multiplier)} tone="text-[#e8b58a]" />
            <StatTile label="Cashout" value={formatCents(potential)} />
          </div>
          {isActive ? (
            <PlayButton disabled={!state?.cashoutAllowed || busy} onClick={() => act.mutate({ type: "cashout" })}>
              {busy ? "Settling…" : `Cash out ${formatCents(potential)}`}
            </PlayButton>
          ) : (
            <PlayButton disabled={!valid || busy} onClick={() => start.mutate()}>
              {busy ? "Starting…" : settled ? "Cross again" : "Start crossing"}
            </PlayButton>
          )}
          <p className="text-center text-[9px] leading-4 text-muted/50">
            {isActive ? "Cross one lane at a time. Traffic is unforgiving." : "Each lane is a new risk. Cash out before the road wins."}
          </p>
        </ControlPanel>
      }
      stage={
        <Stage
          label="Chicken Cross"
          status={
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[9px] font-medium",
                isActive
                  ? "border-[#e0a06c]/30 bg-[#e0a06c]/10 text-[#e8b58a]"
                  : settled
                    ? state?.lost
                      ? "border-red/30 bg-red/10 text-red"
                      : "border-green/30 bg-green/10 text-green"
                    : "border-line/60 text-muted",
              )}
            >
              {isActive
                ? `Lane ${Math.min(lanes, currentLane + 1)}/${lanes}`
                : settled
                  ? state?.lost
                    ? "Traffic hit"
                    : "Safely across"
                  : `${lanes} lanes`}
            </span>
          }
          footer={
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted/60">
                Current value <span className="ml-1 font-medium text-ink">{formatCents(potential)}</span>
              </span>
              <span className="text-muted/60">
                Next lane <span className="ml-1 font-medium text-[#e8b58a]">{formatMultiplier(state?.nextMultiplier ?? 1)}</span>
              </span>
            </div>
          }
        >
          <div className="mx-auto max-w-[680px]">
            <div className="relative overflow-hidden rounded-2xl border border-line/50 bg-[#10150f] p-3">
              <div className="pointer-events-none absolute inset-x-0 top-1/2 border-t border-dashed border-gold/10" />
              <div className="relative overflow-x-auto pb-1">
                <div className="grid min-w-[560px] grid-cols-12 gap-1">
                  {Array.from({ length: lanes }, (_, lane) => {
                    const crossed = lane < currentLane;
                    const current = isActive && lane === currentLane;
                    const fatal = settled && deathLane === lane;
                    return (
                      <div key={lane} className="relative">
                        <div
                          className={cn(
                            "flex h-16 flex-col items-center justify-center rounded-md border text-[8px] font-semibold transition sm:h-20",
                            fatal
                              ? "border-red/50 bg-red/15 text-red"
                              : crossed
                                ? "border-green/30 bg-green/[0.07] text-green"
                                : current
                                  ? "border-[#e0a06c]/50 bg-[#e0a06c]/10 text-[#e8b58a]"
                                  : "border-line/40 bg-bg/30 text-muted/35",
                          )}
                        >
                          {fatal ? <Car className="size-4" /> : lane === currentLane && isActive ? <Bird className="size-4" /> : lane + 1}
                        </div>
                        <p className="mt-1 text-center text-[6px] text-muted/40 sm:text-[7px]">
                          {formatMultiplier(state?.levelMultipliers?.[lane + 1] ?? 1)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!isActive || busy}
                onClick={() => act.mutate({ type: "cross" })}
                className="flex h-14 items-center justify-center gap-2 rounded-xl border border-transparent bg-gold text-[12px] font-semibold text-[#14100a] transition hover:bg-gold-strong disabled:pointer-events-none disabled:opacity-40"
              >
                <ChevronsRight className="size-4" /> Cross lane
              </button>
              <button
                type="button"
                disabled={!isActive || !state?.cashoutAllowed || busy}
                onClick={() => act.mutate({ type: "cashout" })}
                className="flex h-14 items-center justify-center rounded-xl border border-line bg-surface-2 text-[12px] font-semibold text-ink transition hover:border-line-strong hover:bg-surface-3 disabled:pointer-events-none disabled:opacity-40"
              >
                Cash out {formatCents(potential)}
              </button>
            </div>
            <p className="mt-4 text-center text-[10px] text-muted/55">
              {isActive ? "A single bad lane ends the run." : settled ? "The road is clear. Start again." : "Start the run and time your cashout."}
            </p>
          </div>
        </Stage>
      }
    />
  );
}
