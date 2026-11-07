"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Rocket, TrendingUp } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { newRequestKey } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { BetAmountControl, useBetAmount } from "@/components/games/bet-controls";
import { useGameResult } from "@/components/games/use-game-result";

type LimboResult = { result: number; target: number; win: boolean };

export function LimboGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [targetText, setTargetText] = useState("2.00");
  const [lastBet, setLastBet] = useState<PublicBet | null>(null);
  const result = useGameResult(game.id);
  const target = Math.max(1.01, Math.min(1_000_000, Number.parseFloat(targetText) || 1.01));
  const payout = Math.floor(amountCents * target);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/limbo/play", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          input: { target },
          idempotencyKey: newRequestKey(),
        }),
      }),
    onSuccess: (bet) => {
      setLastBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const limboResult = lastBet?.result as LimboResult | undefined;

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
          <label className="text-[11px] font-semibold text-muted" htmlFor="limbo-target">
            Target multiplier
          </label>
          <div className="mt-2 flex h-11 items-center rounded-lg border border-transparent bg-[#0f212e] px-3 transition focus-within:border-green/50">
            <input
              id="limbo-target"
              inputMode="decimal"
              value={targetText}
              onChange={(event) => setTargetText(event.target.value.replace(/[^0-9.]/g, ""))}
              onBlur={() => setTargetText(target.toFixed(2))}
              className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none"
            />
            <span className="text-sm font-bold text-muted">×</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[1.5, 2, 5, 10, 100, 1000].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setTargetText(value.toFixed(2))}
                className={`rounded-md border px-2.5 py-1.5 text-[9px] font-bold transition ${
                  Math.abs(target - value) < 0.001
                    ? "border-purple/50 bg-purple/10 text-purple"
                    : "border-line/60 bg-[#0f212e] text-muted hover:text-white"
                }`}
              >
                {value >= 1000 ? "1,000×" : `${value}×`}
              </button>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Target</p>
              <p className="mt-1 font-display text-lg font-bold text-purple">{formatMultiplier(target)}</p>
            </div>
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Profit on win</p>
              <p className="mt-1 font-display text-lg font-bold text-white">{formatCents(Math.max(0, payout - amountCents), { compact: true })}</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary mt-4 w-full" disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Climbing…" : `Play to ${formatMultiplier(target)}`}
          </button>
        </section>
      }
      stage={
        <section className="surface relative min-h-[370px] overflow-hidden p-5 sm:p-8">
          <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple/[0.07] blur-3xl" />
          <div className="relative flex min-h-[320px] flex-col">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <TrendingUp className="size-3.5 text-purple" /> Limbo
              </div>
              <div className="rounded-full border border-line/60 bg-[#0f212e]/70 px-2.5 py-1 text-[9px] font-semibold text-muted">
                Target {formatMultiplier(target)}
              </div>
            </div>
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              {lastBet && limboResult ? (
                <motion.div key={lastBet.id} initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
                  <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${limboResult.win ? "text-purple" : "text-red"}`}>
                    {limboResult.win ? "Target reached" : "Below target"}
                  </p>
                  <p className={`mt-2 font-display text-[72px] font-bold leading-none tracking-[-0.07em] sm:text-[96px] ${limboResult.win ? "text-white" : "text-muted/70"}`}>
                    {formatMultiplier(limboResult.result)}
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2 text-xs">
                    <span className="text-muted">Target {formatMultiplier(limboResult.target)}</span>
                    <span className="size-1 rounded-full bg-muted/30" />
                    <span className={limboResult.win ? "font-bold text-green" : "font-bold text-red/80"}>
                      {limboResult.win ? `+${formatCents(lastBet.payoutCents - lastBet.amountCents)}` : `-${formatCents(lastBet.amountCents)}`}
                    </span>
                  </div>
                </motion.div>
              ) : (
                <div>
                  <div className="mx-auto grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-[#9d6bff] to-[#2c1c54] shadow-[0_20px_60px_rgba(157,107,255,0.25)]">
                    <Rocket className="size-10" strokeWidth={1.4} />
                  </div>
                  <p className="mt-5 font-display text-xl font-bold">How high can it go?</p>
                  <p className="mt-1.5 text-xs text-muted">Pick a target. If the result reaches it, you win.</p>
                </div>
              )}
            </div>
            <div className="relative mt-auto h-10 overflow-hidden rounded-lg border border-line/60 bg-[#0f212e]">
              <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-purple/20 via-purple/5 to-transparent" />
              <div className="absolute inset-y-0 flex items-center px-3 text-[9px] font-semibold text-muted/60">1.00×</div>
              <div className="absolute inset-y-0 right-3 flex items-center text-[9px] font-semibold text-muted/60">1,000,000×</div>
              <div className="absolute inset-y-0 left-2 w-[2px] bg-purple shadow-[0_0_10px_#a879ff]" style={{ left: `${Math.min(92, (Math.log10(target) / 6) * 100)}%` }} />
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Rocket className="size-4 text-purple" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Limbo:</strong> every extra decimal raises the payout and lowers the odds.
          </p>
        </div>
      }
    />
  );
}
