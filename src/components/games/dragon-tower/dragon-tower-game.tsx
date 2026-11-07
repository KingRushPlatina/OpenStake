"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Egg, Flame } from "lucide-react";
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

const tilesByDifficulty: Record<Difficulty, number> = { easy: 3, medium: 2, hard: 3, expert: 4 };

export function DragonTowerGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const { activeBet, setActiveBet } = useProgressionBet(game.id);
  const result = useGameResult(game.name);
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

  const act = useMutation({
    mutationFn: (action: { type: "pick"; tile: number } | { type: "cashout" }) =>
      apiFetch<PublicBet>(`/api/games/dragon-tower/${activeBet?.id}/action`, {
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
  const currentLevel = state?.currentLevel ?? 0;
  const tilesPerRow = state?.tilesPerRow ?? tilesByDifficulty[difficulty];

  const tileState = (level: number, tile: number) => {
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
    <GameShell
      game={game}
      controls={
        <ControlPanel title="Climb settings">
          <BetAmountControl
            game={game}
            balanceCents={session.wallet.balanceCents}
            amount={amount}
            setAmount={setAmount}
            disabled={isActive || busy}
          />
          <div>
            <p className="mb-2 text-[10px] font-medium text-muted">Difficulty</p>
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
            <StatTile label="Multiplier" value={formatMultiplier(multiplier)} tone="text-gold" />
            <StatTile label="Cashout" value={formatCents(potential)} />
          </div>
          <div className="flex items-center justify-between text-[10px] text-muted/60">
            <span>Cleared</span>
            <span className="font-medium text-ink">{isActive ? `${currentLevel}/9` : "—"}</span>
          </div>
          {isActive ? (
            <PlayButton disabled={!state?.cashoutAllowed || busy} onClick={() => act.mutate({ type: "cashout" })}>
              {busy ? "Settling…" : `Cash out ${formatCents(potential)}`}
            </PlayButton>
          ) : (
            <PlayButton disabled={!valid || busy} onClick={() => start.mutate()}>
              {busy ? "Building…" : settled ? "New tower" : "Start climb"}
            </PlayButton>
          )}
          <p className="text-center text-[9px] leading-4 text-muted/50">
            {isActive ? "Pick an egg on the current floor." : "Higher difficulty means fewer safe eggs."}
          </p>
        </ControlPanel>
      }
      stage={
        <Stage
          label="Dragon Tower"
          status={
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[9px] font-medium",
                isActive
                  ? "border-gold/30 bg-gold/10 text-gold"
                  : settled
                    ? state?.lost
                      ? "border-red/30 bg-red/10 text-red"
                      : "border-green/30 bg-green/10 text-green"
                    : "border-line/60 text-muted",
              )}
            >
              {isActive
                ? `Floor ${currentLevel + 1} · ${formatMultiplier(multiplier)}`
                : settled
                  ? state?.lost
                    ? "Dragon found"
                    : "Tower cleared"
                  : "9 floors"}
            </span>
          }
          footer={
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-muted/60">
                Safe eggs <span className="ml-1 font-medium text-ink">{tilesPerRow - 1} of {tilesPerRow}</span>
              </span>
              <span className="text-muted/60">
                Next step <span className="ml-1 font-medium text-gold">{formatMultiplier(state?.nextMultiplier ?? 1)}</span>
              </span>
            </div>
          }
        >
          <div className="mx-auto flex max-w-[520px] flex-col-reverse gap-1.5">
            {Array.from({ length: 9 }, (_, level) => {
              const activeLevel = isActive && level === currentLevel;
              return (
                <div
                  key={level}
                  className={cn(
                    "flex items-center gap-4 rounded-lg border px-3 py-1.5 transition",
                    activeLevel ? "border-gold/40 bg-gold/[0.05]" : "border-line/35 bg-bg/25",
                  )}
                >
                  <span className={cn("w-4 text-right text-[8px] font-medium", activeLevel ? "text-gold" : "text-muted/35")}>{level + 1}</span>
                  <div className="flex flex-1 justify-center gap-2">
                    {Array.from({ length: tilesPerRow }, (_, tile) => {
                      const status = tileState(level, tile);
                      const clickable = activeLevel && !busy;
                      return (
                        <motion.button
                          key={tile}
                          type="button"
                          aria-label={`Floor ${level + 1} tile ${tile + 1}`}
                          disabled={!clickable}
                          onClick={() => act.mutate({ type: "pick", tile })}
                          whileHover={clickable ? { y: -2 } : undefined}
                          className={cn(
                            "grid h-9 flex-1 place-items-center rounded-md border text-xs transition sm:h-10",
                            status === "dragon"
                              ? "border-red/30 bg-red/10"
                              : status === "safe"
                                ? "border-green/25 bg-green/[0.06]"
                                : activeLevel
                                  ? "border-line/70 bg-bg/40 hover:border-gold/40 hover:bg-gold/10"
                                  : "border-line/30 bg-bg/20",
                          )}
                        >
                          {status === "dragon" ? (
                            <Flame className="size-4 text-red" />
                          ) : status === "safe" ? (
                            <Egg className="size-4 text-green" />
                          ) : status === "hidden" ? (
                            <span className="size-1.5 rounded-full bg-green/10" />
                          ) : (
                            <Egg className={cn("size-4", activeLevel ? "text-gold/70" : "text-ink/10")} />
                          )}
                        </motion.button>
                      );
                    })}
                  </div>
                  <span className={cn("w-14 text-right text-[8px] font-medium", activeLevel ? "text-gold" : "text-muted/35")}>
                    {level < currentLevel
                      ? formatMultiplier(state?.levelMultipliers[level + 1] ?? 1)
                      : level === currentLevel
                        ? formatMultiplier(state?.nextMultiplier ?? 1)
                        : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        </Stage>
      }
    />
  );
}
