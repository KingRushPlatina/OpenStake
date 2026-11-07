"use client";

import { useMutation } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, ArrowUpDown, History, Sparkles } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { BetAmountControl, useBetAmount } from "@/components/games/bet-controls";
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
  const result = useGameResult(game.id);
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
    mutationFn: (direction: "higher" | "lower") =>
      apiFetch<PublicBet>(`/api/games/hilo/${activeBet?.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: { type: direction }, actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const cashout = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>(`/api/games/hilo/${activeBet?.id}/cashout`, {
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
  const potential = Math.floor((activeBet?.amountCents ?? amountCents) * multiplier);
  const pending = start.isPending || act.isPending || cashout.isPending;
  const history = state?.history ?? [];

  return (
    <GamePageLayout
      game={game}
      controls={
        <section className="surface p-4">
          <BetAmountControl game={game} balanceCents={session.wallet.balanceCents} amount={amount} setAmount={setAmount} disabled={isActive || pending} />
          <div className="my-4 h-px bg-line/60" />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Multiplier</p>
              <p className="mt-1 font-display text-lg font-bold text-red">{formatMultiplier(multiplier)}</p>
            </div>
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Cashout</p>
              <p className="mt-1 font-display text-lg font-bold text-white">{formatCents(potential)}</p>
            </div>
          </div>
          {isActive ? (
            <button type="button" className="btn btn-primary mt-4 w-full" disabled={!state?.cashoutAllowed || pending} onClick={() => cashout.mutate()}>
              {pending ? "Settling…" : `Cash out ${formatCents(potential)}`}
            </button>
          ) : (
            <button type="button" className="btn btn-primary mt-4 w-full" disabled={!valid || pending} onClick={() => start.mutate()}>
              {pending ? "Dealing…" : settled ? "New round" : "Start round"}
            </button>
          )}
          <div className="mt-4 rounded-lg border border-line/50 bg-[#0f212e]/60 p-2.5">
            <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted/60">
              <History className="size-3" /> Cards left
            </div>
            <p className="mt-1 text-xs font-semibold text-white">{state?.cardsRemaining ?? 312}</p>
          </div>
        </section>
      }
      stage={
        <section className="surface relative min-h-[480px] overflow-hidden p-4 sm:p-6">
          <div className="absolute left-1/2 top-1/2 size-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-red/[0.06] blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <ArrowUpDown className="size-3.5 text-red" /> HiLo
              </div>
              <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", isActive ? "border-red/30 bg-red/10 text-red" : "border-line/60 bg-[#0f212e] text-muted")}>
                {isActive ? `${formatMultiplier(multiplier)} · ${formatCents(potential)}` : settled ? (state?.lost ? "Wrong call" : "Cashed out") : "Higher or lower"}
              </div>
            </div>

            <div className="mx-auto mt-6 flex max-w-[560px] flex-col items-center">
              <div className="relative">
                {state?.currentCard ? <PlayingCard card={state.currentCard} size="lg" /> : <PlayingCard hidden size="lg" />}
              </div>
              <div className="mt-5 grid w-full grid-cols-2 gap-3">
                <button
                  type="button"
                  disabled={!isActive || !state?.higherMultiplier || pending}
                  onClick={() => act.mutate("higher")}
                  className="group flex h-16 flex-col items-center justify-center rounded-xl border border-green/25 bg-green/[0.06] transition hover:bg-green/10 disabled:opacity-35"
                >
                  <span className="flex items-center gap-1 text-[11px] font-bold text-green"><ArrowUp className="size-4" /> Higher</span>
                  <span className="mt-0.5 text-[10px] text-muted">{state?.higherMultiplier ? formatMultiplier(state.higherMultiplier) : "—"}</span>
                </button>
                <button
                  type="button"
                  disabled={!isActive || !state?.lowerMultiplier || pending}
                  onClick={() => act.mutate("lower")}
                  className="group flex h-16 flex-col items-center justify-center rounded-xl border border-red/25 bg-red/[0.06] transition hover:bg-red/10 disabled:opacity-35"
                >
                  <span className="flex items-center gap-1 text-[11px] font-bold text-red"><ArrowDown className="size-4" /> Lower</span>
                  <span className="mt-0.5 text-[10px] text-muted">{state?.lowerMultiplier ? formatMultiplier(state.lowerMultiplier) : "—"}</span>
                </button>
              </div>
              {history.length > 0 ? (
                <div className="mt-5 flex w-full items-center gap-2 overflow-x-auto pb-1">
                  {history.map((entry, index) => (
                    <div key={`${entry.card}-${index}`} className="flex items-center gap-1.5 rounded-lg border border-line/40 bg-[#0f212e]/70 px-2 py-1.5">
                      <PlayingCard card={entry.card} size="xs" />
                      <div>
                        <p className={cn("text-[9px] font-bold uppercase", entry.won ? "text-green" : "text-red")}>{entry.direction}</p>
                        <p className="text-[9px] text-muted">{formatMultiplier(entry.multiplier)}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              <div className="mt-5 flex items-center gap-2 text-[10px] text-muted">
                <Sparkles className="size-3 text-red" />
                {isActive ? "Call the next card. Ties lose." : settled ? "The round is settled." : "Start a round to see the first card."}
              </div>
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <ArrowUpDown className="size-4 text-red" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">HiLo:</strong> build your multiplier one card at a time, then cash out.
          </p>
        </div>
      }
    />
  );
}

