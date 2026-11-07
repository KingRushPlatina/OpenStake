"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Building2, Egg, Flame, Sparkles } from "lucide-react";
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
type TowerPublic = {
  difficulty: Difficulty;
  levels: number;
  tilesPerRow: number;
  currentLevel: number;
  revealed: number[];
  multiplier: number;
  nextMultiplier: number;
  levelMultipliers: number[];
  cashoutAllowed: boolean;
  rows?: number[][];
  lost?: boolean;
};

export function DragonTowerGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const { activeBet, setActiveBet } = useProgressionBet(game.id);
  const result = useGameResult(game.id);
  const state = activeBet?.result as TowerPublic | undefined;
  const isActive = activeBet?.status === "active";
  const settled = activeBet?.status === "settled";
  const rows = state?.rows ?? [];

  const start = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/dragon-tower/start", {
        method: "POST",
        body: JSON.stringify({ amountCents, input: { difficulty }, idempotencyKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const pick = useMutation({
    mutationFn: (tile: number) =>
      apiFetch<PublicBet>(`/api/games/dragon-tower/${activeBet?.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: { type: "pick", tile }, actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const cashout = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>(`/api/games/dragon-tower/${activeBet?.id}/cashout`, {
        method: "POST",
        body: JSON.stringify({ actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const busy = start.isPending || pick.isPending || cashout.isPending;
  const multiplier = state?.multiplier ?? 1;
  const potential = Math.floor((activeBet?.amountCents ?? amountCents) * multiplier);
  const currentLevel = state?.currentLevel ?? 0;
  const previewTiles: Record<Difficulty, number> = { easy: 3, medium: 2, hard: 3, expert: 4 };
  const tilesPerRow = state?.tilesPerRow ?? previewTiles[difficulty];

  const levelState = (level: number, tile: number) => {
    const revealedTile = state?.revealed[level];
    const dragonTiles = rows[level] ?? [];
    const isDragon = dragonTiles.includes(tile);
    const selected = revealedTile === tile;
    if (settled && isDragon) return "dragon";
    if (selected && isDragon) return "dragon";
    if (selected) return "safe";
    if (level < currentLevel) return "hidden";
    return "empty";
  };

  return (
    <GamePageLayout
      game={game}
      controls={
        <section className="surface p-4">
          <BetAmountControl game={game} balanceCents={session.wallet.balanceCents} amount={amount} setAmount={setAmount} disabled={isActive || busy} />
          <div className="my-4 h-px bg-line/60" />
          <p className="mb-2 text-[11px] font-semibold text-muted">Difficulty</p>
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
              <p className="mt-1 font-display text-lg font-bold text-purple">{formatMultiplier(multiplier)}</p>
            </div>
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Cashout</p>
              <p className="mt-1 font-display text-lg font-bold text-white">{formatCents(potential)}</p>
            </div>
          </div>
          <div className="mt-4 flex justify-between text-[10px] text-muted">
            <span>Floor</span>
            <span className="font-bold text-white">{isActive ? `${currentLevel}/9` : "—"}</span>
          </div>
          {isActive ? (
            <button type="button" className="btn btn-primary mt-4 w-full" disabled={!state?.cashoutAllowed || busy} onClick={() => cashout.mutate()}>
              {busy ? "Settling…" : `Cash out ${formatCents(potential)}`}
            </button>
          ) : (
            <button type="button" className="btn btn-primary mt-4 w-full" disabled={!valid || busy} onClick={() => start.mutate()}>
              {busy ? "Building…" : settled ? "New tower" : "Start climb"}
            </button>
          )}
          <p className="mt-3 text-center text-[10px] leading-4 text-muted/65">
            {isActive ? "Pick an egg on the current floor." : "Higher difficulty means fewer safe eggs."}
          </p>
        </section>
      }
      stage={
        <section className="surface relative min-h-[560px] overflow-hidden p-4 sm:p-6">
          <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple/[0.07] blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <Building2 className="size-3.5 text-purple" /> Dragon Tower
              </div>
              <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", isActive ? "border-purple/30 bg-purple/10 text-purple" : settled ? (state?.lost ? "border-red/30 bg-red/10 text-red" : "border-green/30 bg-green/10 text-green") : "border-line/60 bg-[#0f212e] text-muted")}>
                {isActive ? `Floor ${currentLevel + 1} · ${formatMultiplier(multiplier)}` : settled ? (state?.lost ? "Dragon found" : "Tower cleared") : "9 floors"}
              </div>
            </div>

            <div className="mx-auto mt-5 flex max-w-[520px] flex-col-reverse gap-1.5">
              {Array.from({ length: 9 }, (_, level) => {
                const activeLevel = isActive && level === currentLevel;
                return (
                  <div
                    key={level}
                    className={cn(
                      "flex items-center gap-4 rounded-lg border px-3 py-1.5 transition",
                      activeLevel ? "border-purple/40 bg-purple/[0.06]" : "border-line/35 bg-[#0f212e]/55",
                    )}
                  >
                    <span className={cn("w-4 text-right text-[9px] font-bold", activeLevel ? "text-purple" : "text-muted/40")}>{level + 1}</span>
                    <div className="flex flex-1 justify-center gap-2">
                      {Array.from({ length: tilesPerRow }, (_, tile) => {
                        const tileState = levelState(level, tile);
                        const clickable = activeLevel && !busy;
                        const content =
                          tileState === "dragon" ? (
                            <Flame className="size-4 text-red" />
                          ) : tileState === "safe" ? (
                            <Egg className="size-4 text-green" />
                          ) : (
                            <Egg className={cn("size-4", activeLevel ? "text-purple/70" : "text-white/15")} />
                          );
                        return (
                          <motion.button
                            key={tile}
                            type="button"
                            disabled={!clickable}
                            onClick={() => pick.mutate(tile)}
                            whileHover={clickable ? { y: -2 } : undefined}
                            className={cn(
                              "grid h-9 flex-1 place-items-center rounded-md border text-xs transition sm:h-10",
                              tileState === "dragon"
                                ? "border-red/30 bg-red/10"
                                : tileState === "safe"
                                  ? "border-green/25 bg-green/[0.06]"
                                  : activeLevel
                                    ? "border-line/70 bg-[#152a36] hover:border-purple/40 hover:bg-purple/10"
                                    : "border-line/30 bg-[#0f212e]",
                            )}
                          >
                            {content}
                          </motion.button>
                        );
                      })}
                    </div>
                    <span className={cn("w-14 text-right text-[9px] font-semibold", activeLevel ? "text-purple" : "text-muted/40")}>
                      {level < currentLevel ? formatMultiplier(state?.levelMultipliers[level + 1] ?? 1) : level === currentLevel ? formatMultiplier(state?.nextMultiplier ?? 1) : "—"}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted">
              <Sparkles className="size-3 text-purple" />
              {isActive ? "One dragon ends the climb. Cash out at any time." : "Choose a difficulty and start at the bottom."}
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Egg className="size-4 text-purple" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Dragon Tower:</strong> every completed floor grows your multiplier.
          </p>
        </div>
      }
    />
  );
}
