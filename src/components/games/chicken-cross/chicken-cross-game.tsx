"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ChevronsUp, Wallet } from "lucide-react";
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
import { ChickenScene } from "./chicken-scene";

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

const survival: Record<Difficulty, { rate: number; label: string }> = {
  easy: { rate: 0.9, label: "90% safe per lane" },
  medium: { rate: 0.75, label: "75% safe per lane" },
  hard: { rate: 0.6, label: "60% safe per lane" },
  expert: { rate: 0.4, label: "40% safe per lane" },
};

function previewLevels(difficulty: Difficulty) {
  return Array.from({ length: 13 }, (_, lane) =>
    lane === 0 ? 1 : Math.floor(0.99 * (1 / survival[difficulty].rate) ** lane * 10_000) / 10_000,
  );
}

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
  const lanes = state?.lanes ?? 12;
  const currentLane = state?.currentLane ?? 0;
  const deathLane = state?.deathLane;
  const stakeCents = activeBet?.amountCents ?? amountCents;
  const levels =
    state && (isActive || state.difficulty === difficulty) ? state.levelMultipliers : previewLevels(difficulty);
  const nextMultiplier = state && isActive ? state.nextMultiplier : levels[1] ?? 1;
  const potential =
    activeBet?.status === "settled"
      ? activeBet.payoutCents
      : Math.floor(stakeCents * multiplier);
  const profit = potential - stakeCents;
  const crossedAll = settled && !state?.lost && currentLane >= lanes;
  const cashedOut = settled && !state?.lost && currentLane < lanes;

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
            <div className="mb-2 flex items-center justify-between">
              <p className="text-[10px] font-medium text-muted">Traffic</p>
              <span className="text-[9px] text-muted/45">{survival[difficulty].label}</span>
            </div>
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
            <StatTile
              label="Profit now"
              value={`${profit >= 0 ? "+" : ""}${formatCents(profit)}`}
              tone={profit > 0 ? "text-green" : undefined}
            />
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
            {isActive
              ? "Hop one lane at a time. Traffic is unforgiving."
              : settled
                ? crossedAll
                  ? "Every lane cleared. The road is yours."
                  : cashedOut
                    ? "Cashed out safely. Run it again."
                    : "The road won that one. Try again."
                : "Every hop raises the multiplier. Cash out before the road wins."}
          </p>
        </ControlPanel>
      }
      stage={
        <Stage
          label="Chicken Cross"
          status={
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[9px] font-medium tabular-nums",
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
                ? `${formatMultiplier(multiplier)} · lane ${currentLane}/${lanes}`
                : settled
                  ? state?.lost
                    ? "Traffic hit"
                    : crossedAll
                      ? "Safely across"
                      : "Cashed out"
                  : `${lanes} lanes`}
            </span>
          }
          footer={
            <div className="grid grid-cols-3 gap-2 text-[10px]">
              <span className="text-muted/60">
                Stake <span className="ml-1 font-medium tabular-nums text-ink">{formatCents(stakeCents)}</span>
              </span>
              <span className="text-center text-muted/60">
                Cashout <span className="ml-1 font-medium tabular-nums text-ink">{formatCents(potential)}</span>
              </span>
              <span className="text-right text-muted/60">
                Next hop <span className="ml-1 font-medium tabular-nums text-[#e8b58a]">{formatMultiplier(nextMultiplier)}</span>
              </span>
            </div>
          }
        >
          <div className="mx-auto max-w-[640px]">
            <ChickenScene
              lanes={lanes}
              currentLane={currentLane}
              levelMultipliers={levels}
              isActive={isActive}
              settled={settled}
              lost={Boolean(state?.lost)}
              deathLane={deathLane}
              multiplier={multiplier}
              potentialCents={potential}
              stakeCents={stakeCents}
              betKey={activeBet?.id ?? "idle"}
            />

            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!isActive || busy}
                onClick={() => act.mutate({ type: "cross" })}
                className="group relative flex h-14 items-center justify-center gap-2 overflow-hidden rounded-xl border border-transparent bg-gold text-[12px] font-semibold text-[#14100a] transition hover:bg-gold-strong disabled:pointer-events-none disabled:opacity-40"
              >
                <span className="absolute inset-0 bg-[linear-gradient(115deg,transparent_30%,rgba(255,255,255,0.35)_50%,transparent_70%)] opacity-0 transition group-hover:opacity-100" />
                <ChevronsUp className="size-4" /> Cross lane
                <span className="rounded-full bg-black/15 px-1.5 py-0.5 text-[9px] tabular-nums text-[#14100a]/80">
                  {formatMultiplier(nextMultiplier)}
                </span>
              </button>
              <button
                type="button"
                disabled={!isActive || !state?.cashoutAllowed || busy}
                onClick={() => act.mutate({ type: "cashout" })}
                className="flex h-14 items-center justify-center gap-2 rounded-xl border border-line bg-surface-2 text-[12px] font-semibold text-ink transition hover:border-line-strong hover:bg-surface-3 disabled:pointer-events-none disabled:opacity-40"
              >
                <Wallet className="size-4 text-green" />
                {isActive ? formatCents(potential) : "Cash out"}
              </button>
            </div>
            <p className="mt-4 text-center text-[10px] text-muted/55">
              {isActive
                ? "A single bad lane ends the run. The barrier lifts at the finish."
                : settled
                  ? crossedAll
                    ? "Perfect crossing. The chicken made it home."
                    : "The road is clear. Start again."
                  : "Start the run, then hop lane by lane and time your cashout."}
            </p>
          </div>
        </Stage>
      }
    />
  );
}
