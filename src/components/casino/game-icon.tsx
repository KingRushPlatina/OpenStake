import {
  ArrowUpDown,
  Bird,
  Bomb,
  Building2,
  Cherry,
  CircleDashed,
  CircleDot,
  Club,
  Dices,
  Disc3,
  Gem,
  Grid3x3,
  Layers3,
  Rocket,
  Spade,
  TrendingUp,
} from "lucide-react";
import { cn } from "@/lib/client-utils";
import type { GameAccent } from "@/modules/games/types";

const iconMap = {
  dice: Dices,
  limbo: TrendingUp,
  plinko: Grid3x3,
  mines: Bomb,
  keno: CircleDot,
  wheel: Disc3,
  hilo: ArrowUpDown,
  tower: Building2,
  chicken: Bird,
  crash: Rocket,
  blackjack: Spade,
  roulette: CircleDashed,
  baccarat: Club,
  poker: Layers3,
  slots: Cherry,
  relic: Gem,
};

const accentMap: Record<GameAccent, string> = {
  blue: "from-[#2d7fc4] via-[#1b5d93] to-[#0b2f4d]",
  purple: "from-[#9d6bff] via-[#6f45c8] to-[#2c1c54]",
  pink: "from-[#ff75b2] via-[#c13a7b] to-[#4a1732]",
  green: "from-[#32d96b] via-[#168c45] to-[#0a3620]",
  amber: "from-[#ffc247] via-[#c28612] to-[#463109]",
  red: "from-[#ff6d6d] via-[#c23434] to-[#441316]",
  cyan: "from-[#54d7e8] via-[#1c8ea3] to-[#0b3942]",
  orange: "from-[#ff9b4a] via-[#c45a13] to-[#4a2208]",
};

export function GameIcon({
  icon,
  accent,
  size = "md",
  className,
}: {
  icon: string;
  accent: GameAccent;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const Icon = iconMap[icon as keyof typeof iconMap] ?? Dices;
  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden bg-gradient-to-br text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.2),0_16px_34px_rgba(0,0,0,0.28)]",
        accentMap[accent],
        size === "sm" && "size-9 rounded-lg",
        size === "md" && "size-12 rounded-xl",
        size === "lg" && "size-16 rounded-2xl",
        size === "xl" && "size-24 rounded-[22px]",
        className,
      )}
    >
      <span className="absolute -right-3 -top-4 size-12 rounded-full bg-white/15 blur-xl" />
      <span className="absolute -bottom-4 -left-3 size-14 rounded-full bg-black/20 blur-md" />
      <Icon
        className={cn(
          "relative drop-shadow-[0_4px_10px_rgba(0,0,0,0.25)]",
          size === "sm" && "size-4",
          size === "md" && "size-6",
          size === "lg" && "size-8",
          size === "xl" && "size-12",
        )}
        strokeWidth={1.7}
      />
    </div>
  );
}
