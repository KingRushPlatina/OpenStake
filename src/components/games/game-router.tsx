"use client";

import { notFound } from "next/navigation";
import type { GameMetadata } from "@/modules/games/types";
import { BlackjackGame } from "./blackjack/blackjack-game";
import { DiceGame } from "./dice/dice-game";
import { LimboGame } from "./limbo/limbo-game";
import { PlinkoGame } from "./plinko/plinko-game";
import { MinesGame } from "./mines/mines-game";
import { KenoGame } from "./keno/keno-game";
import { WheelGame } from "./wheel/wheel-game";
import { HiloGame } from "./hilo/hilo-game";
import { DragonTowerGame } from "./dragon-tower/dragon-tower-game";
import { ChickenCrossGame } from "./chicken-cross/chicken-cross-game";

export function GameRouter({ game }: { game: GameMetadata }) {
  switch (game.id) {
    case "blackjack":
      return <BlackjackGame game={game} />;
    case "dice":
      return <DiceGame game={game} />;
    case "limbo":
      return <LimboGame game={game} />;
    case "plinko":
      return <PlinkoGame game={game} />;
    case "mines":
      return <MinesGame game={game} />;
    case "keno":
      return <KenoGame game={game} />;
    case "wheel":
      return <WheelGame game={game} />;
    case "hilo":
      return <HiloGame game={game} />;
    case "dragon-tower":
      return <DragonTowerGame game={game} />;
    case "chicken-cross":
      return <ChickenCrossGame game={game} />;
    default:
      notFound();
  }
}
