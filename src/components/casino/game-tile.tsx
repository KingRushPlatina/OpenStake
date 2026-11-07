import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { GameMetadata } from "@/modules/games/types";
import { GameMark } from "./game-mark";

export function GameTile({ game }: { game: GameMetadata }) {
  return (
    <Link
      href={`/casino/${game.id}`}
      className="group surface relative overflow-hidden p-4 transition hover:border-gold/30 hover:bg-surface-2/70"
    >
      <div className="pointer-events-none absolute -right-8 -top-10 size-24 rounded-full bg-gold/[0.04] blur-2xl transition group-hover:bg-gold/[0.07]" />
      <div className="relative flex items-start justify-between">
        <GameMark icon={game.icon} accent={game.accent} size="md" />
        <ArrowUpRight className="size-3.5 text-muted/35 transition group-hover:text-gold/80" />
      </div>
      <div className="relative mt-5">
        <p className="text-[13px] font-medium text-ink">{game.name}</p>
        <p className="mt-1 line-clamp-2 text-[10px] leading-4 text-muted/65">{game.tagline}</p>
      </div>
      <div className="relative mt-4 flex items-center justify-between border-t border-line/50 pt-3">
        <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-muted/45">Originals</span>
        <span className="text-[9px] font-medium tabular-nums text-muted/55">{game.rtp} RTP</span>
      </div>
    </Link>
  );
}
