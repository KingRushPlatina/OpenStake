"use client";

import Link from "next/link";
import { Construction } from "lucide-react";
import type { GameMetadata } from "@/modules/games/types";
import { GameIcon } from "@/components/casino/game-icon";
import { DiceGame } from "./dice/dice-game";
import { LimboGame } from "./limbo/limbo-game";
import { PlinkoGame } from "./plinko/plinko-game";
import { KenoGame } from "./keno/keno-game";
import { WheelGame } from "./wheel/wheel-game";
import { MinesGame } from "./mines/mines-game";
import { HiloGame } from "./hilo/hilo-game";
import { DragonTowerGame } from "./dragon-tower/dragon-tower-game";
import { ChickenCrossGame } from "./chicken-cross/chicken-cross-game";
import { VideoPokerGame } from "./video-poker/video-poker-game";
import { BaccaratGame } from "./baccarat/baccarat-game";
import { RouletteGame } from "./roulette/roulette-game";
import { BlackjackGame } from "./blackjack/blackjack-game";
import { CrashGame } from "./crash/crash-game";
import { SlotGame } from "./slots/slot-game";

export function GameRouter({ game }: { game: GameMetadata }) {
  switch (game.id) {
    case "dice":
      return <DiceGame game={game} />;
    case "limbo":
      return <LimboGame game={game} />;
    case "plinko":
      return <PlinkoGame game={game} />;
    case "keno":
      return <KenoGame game={game} />;
    case "wheel":
      return <WheelGame game={game} />;
    case "mines":
      return <MinesGame game={game} />;
    case "hilo":
      return <HiloGame game={game} />;
    case "dragon-tower":
      return <DragonTowerGame game={game} />;
    case "chicken-cross":
      return <ChickenCrossGame game={game} />;
    case "video-poker":
      return <VideoPokerGame game={game} />;
    case "baccarat":
      return <BaccaratGame game={game} />;
    case "roulette":
      return <RouletteGame game={game} />;
    case "blackjack":
      return <BlackjackGame game={game} />;
    case "crash":
      return <CrashGame game={game} />;
    case "neon-fruits":
    case "golden-relic":
      return <SlotGame game={game} />;
    default:
      return (
        <div className="surface flex min-h-[420px] flex-col items-center justify-center gap-4 p-8 text-center">
          <GameIcon icon={game.icon} accent={game.accent} size="lg" />
          <div>
            <p className="font-display text-xl font-bold">{game.name} is being prepared</p>
            <p className="mt-1 max-w-sm text-xs leading-5 text-muted">
              The game engine is registered but its table experience is not wired up yet. Dice is ready to play now.
            </p>
          </div>
          <Link href="/" className="btn btn-secondary h-9 px-4 text-xs">
            <Construction className="size-3.5" /> Back to lobby
          </Link>
        </div>
      );
  }
}
