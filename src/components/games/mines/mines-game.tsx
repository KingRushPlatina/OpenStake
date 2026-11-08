"use client";

import { useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Bomb, Gem } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { playExplosionSound, primeExplosionAudio } from "@/lib/explosion-audio";
import { MineExplosion } from "@/components/games/mines/mine-explosion";
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

type MinesPublic = {
  mineCount: number;
  revealed: number[];
  multiplier: number;
  nextMultiplier: number;
  picks: number;
  cashoutAllowed: boolean;
  mineTiles?: number[];
  lost?: boolean;
};

const minePresets = [1, 3, 5, 10, 24];

export function MinesGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [mineCount, setMineCount] = useState(3);
  const { activeBet, setActiveBet } = useProgressionBet(game.id);
  const result = useGameResult(game.name);
  const [blast, setBlast] = useState<{ tile: number; nonce: number; betId: string } | null>(null);
  const [minesShownFor, setMinesShownFor] = useState<string | null>(null);
  const pendingMine = useRef<string | null>(null);
  const blastNonce = useRef(0);
  const state = activeBet?.result as MinesPublic | undefined;
  const isActive = activeBet?.status === "active";
  const settled = activeBet?.status === "settled";
  const revealSet = new Set(state?.revealed ?? []);
  const mineSet = new Set(state?.mineTiles ?? []);
  const activeBlast = blast && blast.betId === activeBet?.id ? blast : null;
  const showMines = settled && (!state?.lost || minesShownFor === activeBet?.id);

  const start = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/mines/start", {
        method: "POST",
        body: JSON.stringify({ amountCents, input: { mines: mineCount }, idempotencyKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const triggerBlast = (bet: PublicBet) => {
    const data = bet.result as MinesPublic | undefined;
    if (bet.status !== "settled" || !data?.lost || pendingMine.current !== bet.id) return;
    if (data.revealed.length === 0) return;
    pendingMine.current = null;
    blastNonce.current += 1;
    setBlast({
      tile: data.revealed[data.revealed.length - 1],
      nonce: blastNonce.current,
      betId: bet.id,
    });
    playExplosionSound();
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([26, 38, 92]);
    }
    window.setTimeout(() => setMinesShownFor(bet.id), 660);
  };

  const act = useMutation({
    mutationFn: (action: { type: "reveal"; tile: number } | { type: "cashout" }) =>
      apiFetch<PublicBet>(`/api/games/mines/${activeBet?.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action, actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
      triggerBlast(bet);
    },
    onError: (error) => {
      pendingMine.current = null;
      result.onError(error);
    },
  });

  const reveal = (tile: number) => {
    // Unlock audio during the click so the blast can play once the server answers.
    primeExplosionAudio();
    pendingMine.current = activeBet?.id ?? null;
    act.mutate({ type: "reveal", tile });
  };

  const multiplier = state?.multiplier ?? 1;
  const previewNext = Math.floor((0.99 * 25 / (25 - mineCount)) * 10_000) / 10_000;
  const nextMultiplier = state?.nextMultiplier ?? previewNext;
  const potential = Math.floor((activeBet?.amountCents ?? amountCents) * multiplier);
  const busy = start.isPending || act.isPending;

  return (
    <GameShell
      game={game}
      controls={
        <ControlPanel title="Set the board">
          <BetAmountControl
            game={game}
            balanceCents={session.wallet.balanceCents}
            amount={amount}
            setAmount={setAmount}
            disabled={isActive || busy}
          />
          <div>
            <p className="mb-2 text-[10px] font-medium text-muted">Mines</p>
            <div className="grid grid-cols-5 gap-1.5">
              {minePresets.map((count) => (
                <button
                  key={count}
                  type="button"
                  disabled={isActive || busy}
                  onClick={() => setMineCount(count)}
                  className={cn(
                    "h-8 rounded-lg border text-[10px] font-medium transition disabled:opacity-40",
                    mineCount === count
                      ? "border-[#7fd0d8]/40 bg-[#7fd0d8]/10 text-[#9edee4]"
                      : "border-line/60 text-muted hover:text-ink",
                  )}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Current" value={formatMultiplier(multiplier)} tone="text-[#9edee4]" />
            <StatTile label="Next pick" value={formatMultiplier(nextMultiplier)} />
          </div>
          {isActive ? (
            <PlayButton disabled={!state?.cashoutAllowed || busy} onClick={() => act.mutate({ type: "cashout" })}>
              {busy ? "Settling…" : `Cash out ${formatCents(potential)}`}
            </PlayButton>
          ) : (
            <PlayButton disabled={!valid || busy} onClick={() => start.mutate()}>
              {busy ? "Starting…" : settled ? "Play again" : "Start round"}
            </PlayButton>
          )}
          <p className="text-center text-[9px] leading-4 text-muted/50">
            {isActive ? "Reveal a gem to raise the multiplier." : "Pick a mine count, then start the round."}
          </p>
        </ControlPanel>
      }
      stage={
        <Stage
          label="Mines board"
          status={
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[9px] font-medium",
                isActive
                  ? "border-[#7fd0d8]/30 bg-[#7fd0d8]/10 text-[#9edee4]"
                  : settled
                    ? state?.lost
                      ? "border-red/30 bg-red/10 text-red"
                      : "border-green/30 bg-green/10 text-green"
                    : "border-line/60 text-muted",
              )}
            >
              {isActive
                ? `${state?.picks ?? 0} gems · ${formatMultiplier(multiplier)}`
                : settled
                  ? state?.lost
                    ? "Mine hit"
                    : "Cashed out"
                  : `${mineCount} mines`}
            </span>
          }
          footer={
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted/60">
                Potential cashout <span className="ml-1 font-medium text-ink">{formatCents(potential)}</span>
              </span>
              <span className="text-muted/60">
                Safe tiles <span className="ml-1 font-medium text-ink">{25 - mineCount}</span>
              </span>
            </div>
          }
        >
          <div className="relative mx-auto max-w-[520px]">
            {activeBlast ? <span key={`flash-${activeBlast.nonce}`} className="mines-stage-flash" /> : null}
            <div
              key={`board-${activeBlast?.nonce ?? "idle"}`}
              className={cn("grid grid-cols-5 gap-2 sm:gap-3", activeBlast && "mines-board-shake")}
            >
              {Array.from({ length: 25 }, (_, index) => {
                const revealed = revealSet.has(index);
                const mine = mineSet.has(index);
                const lose = settled && state?.lost && mine;
                const hit = activeBlast?.tile === index;
                return (
                  <motion.button
                    key={index}
                    type="button"
                    aria-label={`Reveal tile ${index + 1}`}
                    whileHover={isActive && !revealed ? { scale: 1.03 } : undefined}
                    whileTap={isActive && !revealed ? { scale: 0.97 } : undefined}
                    disabled={!isActive || revealed || busy}
                    onClick={() => reveal(index)}
                    className={cn(
                      "relative grid aspect-square place-items-center rounded-xl border text-2xl transition",
                      hit ? "z-20 overflow-visible" : "overflow-hidden",
                      revealed && mine
                        ? hit
                          ? "mines-mine-burnt text-red"
                          : "border-red/50 bg-red/15 text-red"
                        : revealed
                          ? "border-[#7fd0d8]/40 bg-[#7fd0d8]/10 text-[#9edee4]"
                          : isActive
                            ? "border-line/60 bg-bg/30 hover:border-[#7fd0d8]/40 hover:bg-surface-2"
                            : "border-line/40 bg-bg/25",
                      lose && !hit && showMines && "bg-red/20",
                      hit && "mines-tile-hit",
                    )}
                  >
                    {hit && activeBlast ? <MineExplosion key={activeBlast.nonce} /> : null}
                    {revealed && mine ? (
                      <Bomb className={cn("size-6 sm:size-7", hit && "relative z-10")} />
                    ) : revealed ? (
                      <Gem className="size-6 sm:size-7" />
                    ) : showMines && mine ? (
                      <Bomb className="mines-mine-reveal size-5 text-red/50" />
                    ) : (
                      <span className="size-1.5 rounded-full bg-ink/10" />
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
          <div className="mx-auto mt-5 max-w-[520px]">
            <div className="flex items-center justify-between text-[9px] text-muted/55">
              <span>Progress</span>
              <span>{state?.picks ?? 0} / {25 - mineCount}</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-bg/50">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#7fd0d8]/70 to-green"
                animate={{ width: `${Math.min(100, ((state?.picks ?? 0) / Math.max(1, 25 - mineCount)) * 100)}%` }}
              />
            </div>
          </div>
        </Stage>
      }
    />
  );
}
