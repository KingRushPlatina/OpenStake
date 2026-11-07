import Link from "next/link";
import type { GameMetadata } from "@/modules/games/types";
import { GameIcon } from "./game-icon";

export function GameTile({ game }: { game: GameMetadata }) {
  const content = (
    <>
      <div className="relative flex h-[112px] items-center justify-center overflow-hidden rounded-[9px] bg-[#0f212e] sm:h-[128px]">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(255,255,255,0.06),transparent_60%)]" />
        <GameIcon icon={game.icon} accent={game.accent} size="xl" className="transition duration-300 group-hover:scale-105 group-hover:rotate-1" />
        {!game.available ? (
          <span className="absolute right-2 top-2 rounded-full bg-black/45 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/75">
            Soon
          </span>
        ) : null}
      </div>
      <div className="flex items-start justify-between gap-2 px-1 pt-3">
        <div className="min-w-0">
          <p className="truncate text-[13px] font-bold text-white">{game.name}</p>
          <p className="mt-0.5 truncate text-[10px] text-muted">{game.tagline}</p>
        </div>
        <span className="mt-0.5 shrink-0 rounded bg-white/[0.05] px-1.5 py-0.5 text-[9px] font-bold text-muted/80">{game.rtp}</span>
      </div>
    </>
  );

  if (!game.available) {
    return <div className="game-tile group cursor-not-allowed rounded-xl border border-line/50 bg-[#1a2c38] p-2.5 opacity-60">{content}</div>;
  }

  return (
    <Link href={`/casino/${game.id}`} className="game-tile group rounded-xl border border-line/50 bg-[#1a2c38] p-2.5">
      {content}
    </Link>
  );
}
