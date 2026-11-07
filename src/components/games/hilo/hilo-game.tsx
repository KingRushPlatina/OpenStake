"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowDown, ArrowUp } from "lucide-react";
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
  Stage,
  StatTile,
  useBetAmount,
} from "@/components/games/controls";
import { useGameResult } from "@/components/games/use-game-result";
import { useProgressionBet } from "@/components/games/use-progression-bet";
import { PlayingCard } from "@/components/games/playing-card";

type HiloHistory = { card: string; direction: "higher" | "lower"; won: boolean; multiplier: number };
type HiloPublic = {
  currentCard: string;
  multiplier: number;
  higherMultiplier: number | null;
  lowerMultiplier: number | null;
  history: HiloHistory[];
  cashoutAllowed: boolean;
  cardsRemaining: number;
  finalCard?: string | null;
  lost?: boolean;
};

export function HiloGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const { activeBet, setActiveBet } = useProgressionBet(game.id);
  const result = useGameResult(game.name);
  const state = activeBet?.result as HiloPublic | undefined;
  const isActive = activeBet?.status === "active";
  const settled = activeBet?.status === "settled";

  const start = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/hilo/start", {
        method: "POST",
        body: JSON.stringify({ amountCents, input: {}, idempotencyKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const act = useMutation({
    mutationFn: (action: { type: "higher" | "lower" } | { type: "cashout" }) =>
      apiFetch<PublicBet>(`/api/games/hilo/${activeBet?.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action, actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const multiplier = state?.multiplier ?? 1;
  const potential = Math.floor((activeBet?.amountCents ?? amountCents) * multiplier);
  const pending = start.isPending || act.isPending;
  const history = state?.history ?? [];

  return (
    <GameShell
      game={game}
      controls={
        <ControlPanel title="Play the shoe">
          <BetAmountControl
            game={game}
            balanceCents={session.wallet.balanceCents}
            amount={amount}
            setAmount={setAmount}
            disabled={isActive || pending}
          />
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Multiplier" value={formatMultiplier(multiplier)} tone="text-red/80" />
            <StatTile label="Cashout" value={formatCents(potential)} />
          </div>
          {isActive ? (
            <PlayButton disabled={!state?.cashoutAllowed || pending} onClick={() => act.mutate({ type: "cashout" })}>
              {pending ? "Settling…" : `Cash out ${formatCents(potential)}`}
            </PlayButton>
          ) : (
            <PlayButton disabled={!valid || pending} onClick={() => start.mutate()}>
              {pending ? "Dealing…" : settled ? "New round" : "Start round"}
            </PlayButton>
          )}
          <div className="rounded-xl border border-line/50 bg-bg/30 px-3 py-2.5">
            <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted/45">Cards remaining</p>
            <p className="mt-1 text-[12px] font-medium text-ink">{state?.cardsRemaining ?? 312}</p>
          </div>
        </ControlPanel>
      }
      stage={
        <Stage
          label="HiLo table"
          status={
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[9px] font-medium",
                isActive
                  ? "border-red/30 bg-red/10 text-red"
                  : settled
                    ? state?.lost
                      ? "border-red/30 bg-red/10 text-red"
                      : "border-green/30 bg-green/10 text-green"
                    : "border-line/60 text-muted",
              )}
            >
              {isActive
                ? `${formatMultiplier(multiplier)} · ${formatCents(potential)}`
                : settled
                  ? state?.lost
                    ? "Wrong call"
                    : "Cashed out"
                  : "Higher or lower"}
            </span>
          }
          footer={
            <div className="text-center text-[10px] text-muted/60">
              {isActive ? "Call the next card. Ties lose." : settled ? "The round is settled." : "Start a round to see the first card."}
            </div>
          }
        >
          <div className="table-felt relative mx-auto flex min-h-[380px] max-w-[560px] flex-col items-center overflow-hidden rounded-2xl border border-[#2c4a3b] px-4 py-8">
            <div className="relative">
              {state?.currentCard ? <PlayingCard card={state.currentCard} size="lg" /> : <PlayingCard hidden size="lg" />}
            </div>
            <div className="mt-6 grid w-full max-w-md grid-cols-2 gap-3">
              <button
                type="button"
                disabled={!isActive || !state?.higherMultiplier || pending}
                onClick={() => act.mutate({ type: "higher" })}
                className="group flex h-16 flex-col items-center justify-center rounded-xl border border-green/25 bg-[#07130e]/70 transition hover:bg-green/10 disabled:opacity-35"
              >
                <span className="flex items-center gap-1 text-[11px] font-semibold text-green">
                  <ArrowUp className="size-4" /> Higher
                </span>
                <span className="mt-0.5 text-[10px] text-ink/55">
                  {state?.higherMultiplier ? formatMultiplier(state.higherMultiplier) : "—"}
                </span>
              </button>
              <button
                type="button"
                disabled={!isActive || !state?.lowerMultiplier || pending}
                onClick={() => act.mutate({ type: "lower" })}
                className="group flex h-16 flex-col items-center justify-center rounded-xl border border-red/25 bg-[#07130e]/70 transition hover:bg-red/10 disabled:opacity-35"
              >
                <span className="flex items-center gap-1 text-[11px] font-semibold text-red">
                  <ArrowDown className="size-4" /> Lower
                </span>
                <span className="mt-0.5 text-[10px] text-ink/55">
                  {state?.lowerMultiplier ? formatMultiplier(state.lowerMultiplier) : "—"}
                </span>
              </button>
            </div>
            {history.length > 0 ? (
              <div className="mt-5 flex w-full max-w-md items-center gap-2 overflow-x-auto pb-1">
                {history.map((entry, index) => (
                  <div key={`${entry.card}-${index}`} className="flex shrink-0 items-center gap-1.5 rounded-lg border border-white/10 bg-black/20 px-2 py-1.5">
                    <PlayingCard card={entry.card} size="xs" />
                    <div>
                      <p className={cn("text-[8px] font-semibold uppercase tracking-[0.1em]", entry.won ? "text-green" : "text-red")}>
                        {entry.direction}
                      </p>
                      <p className="text-[9px] text-ink/50">{formatMultiplier(entry.multiplier)}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        </Stage>
      }
    />
  );
}
