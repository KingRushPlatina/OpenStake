"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp } from "lucide-react";
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

type DiceResult = {
  roll: number;
  threshold: number;
  direction: "over" | "under";
  chance: number;
  win: boolean;
};

export function DiceGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [direction, setDirection] = useState<"over" | "under">("under");
  const [chance, setChance] = useState(49.5);
  const [lastBet, setLastBet] = useState<PublicBet | null>(null);
  const result = useGameResult(game.name);

  const payout = 99 / chance;
  const threshold = direction === "under" ? chance : 100 - chance;
  const position = ((chance - 2) / 93) * 100;

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/dice/play", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          input: { direction, chance },
          idempotencyKey: newRequestKey(),
        }),
      }),
    onSuccess: (bet) => {
      setLastBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const lastResult = lastBet?.result as DiceResult | undefined;

  return (
    <GameShell
      game={game}
      controls={
        <ControlPanel title="Place a roll">
          <BetAmountControl
            game={game}
            balanceCents={session.wallet.balanceCents}
            amount={amount}
            setAmount={setAmount}
            disabled={mutation.isPending}
          />
          <div>
            <p className="mb-2 text-[10px] font-medium text-muted">Direction</p>
            <div className="grid grid-cols-2 gap-2">
              {[
                { value: "under" as const, label: "Under", icon: ArrowDown },
                { value: "over" as const, label: "Over", icon: ArrowUp },
              ].map((option) => {
                const Icon = option.icon;
                const active = direction === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setDirection(option.value)}
                    className={`flex h-10 items-center justify-center gap-2 rounded-xl border text-[10px] font-semibold transition ${
                      active
                        ? "border-gold/35 bg-gold/10 text-gold"
                        : "border-line/70 bg-bg/40 text-muted hover:text-ink"
                    }`}
                  >
                    <Icon className="size-3.5" /> {option.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="flex items-end justify-between">
              <p className="text-[10px] font-medium text-muted">Win chance</p>
              <p className="font-display text-xl text-ink">{chance.toFixed(1)}%</p>
            </div>
            <input
              type="range"
              min={2}
              max={95}
              step={0.5}
              value={chance}
              onChange={(event) => setChance(Number(event.target.value))}
              className="mt-3 h-1.5 w-full cursor-pointer appearance-none rounded-full accent-[#4fd39b]"
              style={{
                background: `linear-gradient(to right, #4fd39b 0%, #4fd39b ${position}%, #26322b ${position}%, #26322b 100%)`,
              }}
            />
            <div className="mt-2 flex justify-between text-[8px] uppercase tracking-[0.12em] text-muted/40">
              <span>2%</span>
              <span>95%</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Payout" value={formatMultiplier(payout)} tone="text-green" />
            <StatTile label="Profit on win" value={formatCents(Math.floor(amountCents * payout) - amountCents, { compact: true })} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {[2, 3, 5, 10].map((target) => {
              const targetChance = 99 / target;
              return (
                <button
                  key={target}
                  type="button"
                  onClick={() => setChance(Math.round(targetChance * 10) / 10)}
                  className="rounded-lg border border-line/60 px-2.5 py-1.5 text-[9px] font-medium text-muted transition hover:border-gold/30 hover:text-ink"
                >
                  {target}x
                </button>
              );
            })}
          </div>
          <PlayButton disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Rolling…" : `Roll ${direction} ${threshold.toFixed(2)}`}
          </PlayButton>
        </ControlPanel>
      }
      stage={
        <Stage
          label="Dice table"
          status={
            <span className="rounded-full border border-line/60 px-2.5 py-1 text-[9px] font-medium text-muted">
              {direction === "under" ? "Wins under" : "Wins over"} {threshold.toFixed(2)}
            </span>
          }
          footer={
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted/60">
                Win chance <span className="ml-1 font-medium text-ink">{chance.toFixed(1)}%</span>
              </span>
              <span className="text-muted/60">
                Payout <span className="ml-1 font-medium text-green">{formatMultiplier(payout)}</span>
              </span>
            </div>
          }
        >
          <div className="relative flex min-h-[330px] flex-col">
            <div className="flex flex-1 flex-col items-center justify-center py-8 text-center">
              {lastBet && lastResult ? (
                <motion.div
                  key={lastBet.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center"
                >
                  <p className={`text-[9px] font-semibold uppercase tracking-[0.24em] ${lastResult.win ? "text-green" : "text-red/80"}`}>
                    {lastResult.win ? "Roll won" : "Roll lost"}
                  </p>
                  <p className={`mt-3 font-display text-[76px] leading-none tracking-[-0.06em] ${lastResult.win ? "text-ink" : "text-muted/55"}`}>
                    {lastResult.roll.toFixed(2)}
                  </p>
                  <p className={`mt-3 text-[12px] font-semibold ${lastResult.win ? "text-green" : "text-red/80"}`}>
                    {lastResult.win ? `+${formatCents(lastBet.payoutCents - lastBet.amountCents)}` : `-${formatCents(lastBet.amountCents)}`}
                  </p>
                </motion.div>
              ) : (
                <div className="text-center">
                  <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/45">Win chance</p>
                  <p className="mt-2 font-display text-[52px] leading-none text-ink/90">49.50</p>
                  <p className="mt-4 max-w-xs text-[11px] leading-5 text-muted/65">
                    Set your odds, choose a side and roll. Lower odds raise the multiplier.
                  </p>
                </div>
              )}
            </div>

            <div className="mt-auto">
              <div className="relative h-9 overflow-hidden rounded-lg border border-line/60 bg-bg/40">
                <div
                  className={`absolute inset-y-0 bg-green/10 ${direction === "under" ? "left-0" : "right-0"}`}
                  style={{ width: `${threshold}%` }}
                />
                <div className="absolute inset-0 flex items-center justify-between px-2 text-[8px] font-medium text-muted/35">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
                {lastResult ? (
                  <motion.div
                    initial={false}
                    animate={{ left: `${lastResult.roll}%` }}
                    transition={{ type: "spring", stiffness: 180, damping: 22 }}
                    className="absolute inset-y-0 w-[2px] bg-gold shadow-[0_0_12px_rgba(216,184,120,0.8)]"
                  >
                    <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-gold" />
                  </motion.div>
                ) : null}
              </div>
            </div>
          </div>
        </Stage>
      }
    />
  );
}
