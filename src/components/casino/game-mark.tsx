import {
  ArrowUpDown,
  Bird,
  Bomb,
  Building2,
  CircleDot,
  Dices,
  Disc3,
  Grid3x3,
  Orbit,
  Spade,
  TrendingUp,
} from "lucide-react";
import type { GameAccent } from "@/modules/games/types";
import { cn } from "@/lib/client-utils";

const iconMap = {
  blackjack: Spade,
  roulette: Orbit,
  dice: Dices,
  limbo: TrendingUp,
  plinko: Grid3x3,
  mines: Bomb,
  keno: CircleDot,
  wheel: Disc3,
  hilo: ArrowUpDown,
  tower: Building2,
  chicken: Bird,
};

const accentMap: Record<GameAccent, string> = {
  blue: "border-[#7fb2d9]/25 bg-[#7fb2d9]/10 text-[#9ec8e8]",
  purple: "border-[#a88be0]/25 bg-[#a88be0]/10 text-[#c3a9ec]",
  pink: "border-[#e39ab8]/25 bg-[#e39ab8]/10 text-[#edb6cc]",
  green: "border-green/25 bg-green/10 text-green",
  amber: "border-gold/25 bg-gold/10 text-gold",
  red: "border-red/25 bg-red/10 text-red",
  cyan: "border-[#7fd0d8]/25 bg-[#7fd0d8]/10 text-[#9edee4]",
  orange: "border-[#e0a06c]/25 bg-[#e0a06c]/10 text-[#e8b58a]",
};

const sizes = {
  sm: "size-9 rounded-[9px]",
  md: "size-11 rounded-[10px]",
  lg: "size-14 rounded-xl",
  xl: "size-[72px] rounded-[16px]",
};

const iconSizes = {
  sm: "size-4",
  md: "size-5",
  lg: "size-6",
  xl: "size-8",
};

export function GameMark({
  icon,
  accent,
  size = "md",
  className,
}: {
  icon: string;
  accent: GameAccent;
  size?: keyof typeof sizes;
  className?: string;
}) {
  const Icon = iconMap[icon as keyof typeof iconMap] ?? Dices;
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center border shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        accentMap[accent],
        sizes[size],
        className,
      )}
    >
      <span className="absolute inset-[3px] rounded-[7px] border border-current opacity-10" />
      <Icon className={cn("relative", iconSizes[size])} strokeWidth={1.6} />
    </span>
  );
}
