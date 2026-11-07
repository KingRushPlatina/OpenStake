"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Layers3, Sparkles } from "lucide-react";
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
import { videoPokerPaytable } from "@/modules/games/stateful/video-poker";

type VideoPokerPublic = {
  initialCards: string[];
  phase: "holding";
  paytable: readonly { name: string; multiplier: number }[];
  finalCards?: string[];
  holds?: number[];
  handName?: string;
  win?: boolean;
};

export function VideoPokerGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const { activeBet, setActiveBet } = useProgressionBet(game.id);
  const [holds, setHolds] = useState<number[]>([]);
  const result = useGameResult(game.id);
  const state = activeBet?.result as VideoPokerPublic | undefined;
  const isActive = activeBet?.status === "active";
  const settled = activeBet?.status === "settled";

  const start = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/video-poker/start", {
        method: "POST",
        body: JSON.stringify({ amountCents, input: {}, idempotencyKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      setHolds([]);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const draw = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>(`/api/games/video-poker/${activeBet?.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: { type: "draw", holds }, actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const busy = start.isPending || draw.isPending;
  const cards = state?.initialCards ?? [];
  const finalCards = state?.finalCards ?? [];
  const displayCards = settled && finalCards.length > 0 ? finalCards : cards;
  const payout = activeBet?.payoutCents ?? 0;

  return (
    <GamePageLayout
      game={game}
      controls={
        <section className="surface p-4">
          <BetAmountControl game={game} balanceCents={session.wallet.balanceCents} amount={amount} setAmount={setAmount} disabled={isActive || busy} />
          <div className="my-4 h-px bg-line/60" />
          <div className="rounded-lg bg-[#0f212e] p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted/60">9/6 Jacks or Better</p>
            <div className="mt-2 space-y-1">
              {videoPokerPaytable.slice(0, 9).map((row) => (
                <div key={row.name} className="flex items-center justify-between text-[10px]">
                  <span className="text-muted">{row.name}</span>
                  <span className={cn("font-bold", row.multiplier > 0 ? "text-white" : "text-muted/40")}>{formatMultiplier(row.multiplier)}</span>
                </div>
              ))}
            </div>
          </div>
          {isActive ? (
            <button type="button" className="btn btn-primary mt-4 w-full" disabled={busy} onClick={() => draw.mutate()}>
              {busy ? "Drawing…" : "Draw cards"}
            </button>
          ) : (
            <button type="button" className="btn btn-primary mt-4 w-full" disabled={!valid || busy} onClick={() => start.mutate()}>
              {busy ? "Dealing…" : settled ? "New hand" : "Deal cards"}
            </button>
          )}
          <p className="mt-3 text-center text-[10px] text-muted/65">
            {isActive ? "Choose cards to hold, then draw." : "A single-player video poker classic."}
          </p>
        </section>
      }
      stage={
        <section className="surface relative min-h-[480px] overflow-hidden p-4 sm:p-6">
          <div className="absolute left-1/2 top-1/2 size-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-cyan/[0.06] blur-3xl" />
          <div className="relative flex min-h-[440px] flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <Layers3 className="size-3.5 text-cyan" /> Video Poker
              </div>
              <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", settled ? (payout > (activeBet?.amountCents ?? 0) ? "border-green/30 bg-green/10 text-green" : "border-line/60 bg-[#0f212e] text-muted") : "border-line/60 bg-[#0f212e] text-muted")}>
                {settled ? `${state?.handName ?? "No win"} · ${formatCents(payout)}` : isActive ? "Choose your holds" : "Ready to deal"}
              </div>
            </div>

            <div className="flex flex-1 flex-col items-center justify-center py-8">
              {displayCards.length === 0 ? (
                <div className="flex gap-2.5 opacity-40">
                  {Array.from({ length: 5 }, (_, index) => (
                    <PlayingCard key={index} hidden size="md" delay={index * 0.05} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap justify-center gap-2.5 sm:gap-3">
                  {displayCards.map((card, index) => (
                    <div key={`${card}-${index}`} className="flex flex-col items-center gap-2">
                      <PlayingCard card={card} size="md" delay={index * 0.06} />
                      {isActive ? (
                        <button
                          type="button"
                          onClick={() => setHolds((current) => (current.includes(index) ? current.filter((item) => item !== index) : [...current, index]))}
                          className={cn(
                            "h-7 w-full rounded-md border text-[9px] font-bold transition",
                            holds.includes(index) ? "border-cyan/50 bg-cyan/15 text-cyan" : "border-line/60 bg-[#0f212e] text-muted hover:text-white",
                          )}
                        >
                          {holds.includes(index) ? "Held" : "Hold"}
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
              {settled ? (
                <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-6 text-center text-sm font-bold">
                  <span className={payout > (activeBet?.amountCents ?? 0) ? "text-green" : "text-muted"}>{state?.handName ?? "No win"}</span>
                  <span className="ml-2 text-muted">·</span>
                  <span className="ml-2 text-white">{formatCents(payout)}</span>
                </motion.p>
              ) : null}
            </div>

            <div className="flex items-center justify-center gap-2 text-[10px] text-muted">
              <Sparkles className="size-3 text-cyan" />
              {isActive ? "Hold the cards you want to keep. Everything else is replaced." : settled ? "Start a new hand to try again." : "Deal five cards. Hold. Draw."}
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Layers3 className="size-4 text-cyan" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Video Poker:</strong> the 9/6 paytable rewards disciplined holds.
          </p>
        </div>
      }
    />
  );
}
