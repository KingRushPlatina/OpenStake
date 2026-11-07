"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { newRequestKey } from "@/lib/client-utils";
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

type LimboResult = { result: number; target: number; win: boolean };

const presets = [1.5, 2, 5, 10, 100, 1000];

export function LimboGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [targetText, setTargetText] = useState("2.00");
  const [lastBet, setLastBet] = useState<PublicBet | null>(null);
  const result = useGameResult(game.name);
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
    <GameShell
      game={game}
      controls={
        <ControlPanel title="Set a target">
          <BetAmountControl
            game={game}
            balanceCents={session.wallet.balanceCents}
            amount={amount}
            setAmount={setAmount}
            disabled={mutation.isPending}
          />
          <div>
            <label className="text-[10px] font-medium text-muted" htmlFor="limbo-target">
              Target multiplier
            </label>
            <div className="mt-2 flex h-12 items-center rounded-xl border border-line bg-[#0a0e0c] px-3 transition focus-within:border-gold/40">
              <input
                id="limbo-target"
                inputMode="decimal"
                value={targetText}
                onChange={(event) => setTargetText(event.target.value.replace(/[^0-9.]/g, ""))}
                onBlur={() => setTargetText(target.toFixed(2))}
                className="h-full min-w-0 flex-1 bg-transparent text-[15px] font-semibold text-ink outline-none"
              />
              <span className="text-sm font-medium text-muted">×</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {presets.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setTargetText(value.toFixed(2))}
                  className={`rounded-lg border px-2.5 py-1.5 text-[9px] font-medium transition ${
                    Math.abs(target - value) < 0.001
                      ? "border-gold/35 bg-gold/10 text-gold"
                      : "border-line/60 text-muted hover:text-ink"
                  }`}
                >
                  {value >= 1000 ? "1,000×" : `${value}×`}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Target" value={formatMultiplier(target)} tone="text-[#c3a9ec]" />
            <StatTile label="Profit on win" value={formatCents(Math.max(0, payout - amountCents), { compact: true })} />
          </div>
          <PlayButton disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Climbing…" : `Play to ${formatMultiplier(target)}`}
          </PlayButton>
        </ControlPanel>
      }
      stage={
        <Stage
          label="Limbo table"
          status={
            <span className="rounded-full border border-line/60 px-2.5 py-1 text-[9px] font-medium text-muted">
              Target {formatMultiplier(target)}
            </span>
          }
          footer={
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted/60">
                Result <span className="ml-1 font-medium text-ink">{limboResult ? formatMultiplier(limboResult.result) : "—"}</span>
              </span>
              <span className="text-muted/60">
                Target <span className="ml-1 font-medium text-[#c3a9ec]">{formatMultiplier(target)}</span>
              </span>
            </div>
          }
        >
          <div className="relative flex min-h-[330px] flex-col">
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              {lastBet && limboResult ? (
                <motion.div key={lastBet.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                  <p className={`text-[9px] font-semibold uppercase tracking-[0.24em] ${limboResult.win ? "text-[#c3a9ec]" : "text-red/80"}`}>
                    {limboResult.win ? "Target reached" : "Below target"}
                  </p>
                  <p className={`mt-3 font-display text-[76px] leading-none tracking-[-0.06em] ${limboResult.win ? "text-ink" : "text-muted/50"}`}>
                    {formatMultiplier(limboResult.result)}
                  </p>
                  <p className={`mt-3 text-[12px] font-semibold ${limboResult.win ? "text-green" : "text-red/80"}`}>
                    {limboResult.win ? `+${formatCents(lastBet.payoutCents - lastBet.amountCents)}` : `-${formatCents(lastBet.amountCents)}`}
                  </p>
                </motion.div>
              ) : (
                <div className="text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/45">Target</p>
                  <p className="mt-3 font-display text-[64px] leading-none text-ink/20">2.00×</p>
                  <p className="mt-5 max-w-xs text-[11px] leading-5 text-muted/65">
                    Pick a target. If the draw reaches it, the stake pays at that multiplier.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-auto">
              <div className="relative h-9 overflow-hidden rounded-lg border border-line/60 bg-bg/40">
                <div className="absolute inset-y-0 left-0 w-full bg-gradient-to-r from-[#a88be0]/10 to-transparent" />
                <div className="absolute inset-y-0 left-3 flex items-center text-[8px] font-medium text-muted/35">1.00×</div>
                <div className="absolute inset-y-0 right-3 flex items-center text-[8px] font-medium text-muted/35">1,000,000×</div>
                <div
                  className="absolute inset-y-0 w-[2px] bg-[#c3a9ec] shadow-[0_0_10px_rgba(195,169,236,0.7)]"
                  style={{ left: `${Math.min(92, Math.max(4, (Math.log10(target) / 6) * 100))}%` }}
                >
                  <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-[#c3a9ec]" />
                </div>
              </div>
            </div>
          </div>
        </Stage>
      }
    />
  );
}
