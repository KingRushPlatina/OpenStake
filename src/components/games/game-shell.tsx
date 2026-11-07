"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import type { GameMetadata } from "@/modules/games/types";
import { useSession } from "@/components/session-provider";
import { Badge } from "@/components/ui/badge";
import { GameMark } from "@/components/casino/game-mark";
import { LiveBets } from "@/components/casino/live-bets";
import { TopUpNotice } from "@/components/casino/top-up-notice";
import { formatCents } from "@/lib/money";
import { HistoryTable } from "./history-table";

export function GameShell({
  game,
  controls,
  stage,
}: {
  game: GameMetadata;
  controls: React.ReactNode;
  stage: React.ReactNode;
}) {
  const { session } = useSession();
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-5 border-b border-line/70 pb-6">
        <div className="flex items-center gap-4">
          <Link
            href="/#games"
            aria-label="Back to originals"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-line text-muted transition hover:border-line-strong hover:text-ink"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <GameMark icon={game.icon} accent={game.accent} size="lg" />
          <div className="min-w-0">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gold/70">
              Originals · {game.id === "roulette" || game.kind === "stateful" ? "Table" : "Instant"}
            </p>
            <h1 className="mt-1 text-3xl text-ink sm:text-4xl">{game.name}</h1>
            <p className="mt-1 text-[11px] text-muted/65">{game.tagline}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="gold">Originals</Badge>
          <Badge>{game.rtp} RTP</Badge>
          <span className="hidden h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 text-[11px] sm:flex">
            <span className="text-muted">Balance</span>
            <span className="font-semibold tabular-nums text-ink">{formatCents(session.wallet.balanceCents)}</span>
          </span>
        </div>
      </header>

      <TopUpNotice minBetCents={game.minBetCents} />

      <div className="grid items-start gap-5 xl:grid-cols-[280px_minmax(0,1fr)_280px]">
        <aside className="min-w-0 space-y-4">{controls}</aside>
        <div className="min-w-0 space-y-5">
          {stage}
          <HistoryTable gameId={game.id} />
        </div>
        <aside className="sticky top-[96px] hidden xl:block">
          <LiveBets limit={18} />
        </aside>
      </div>
    </div>
  );
}
