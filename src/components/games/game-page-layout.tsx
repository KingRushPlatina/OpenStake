"use client";

import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { GameMetadata } from "@/modules/games/types";
import { GameIcon } from "@/components/casino/game-icon";
import { LiveBets } from "@/components/casino/live-bets";
import { useSession } from "@/components/session-provider";
import { cn } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";
import { HistoryTable } from "./history-table";
import { SeedPanel } from "./seed-panel";

export function GamePageLayout({
  game,
  controls,
  stage,
  mobileSide,
  wide = false,
  showHistory = true,
  showSeedPanel = true,
}: {
  game: GameMetadata;
  controls: React.ReactNode;
  stage: React.ReactNode;
  mobileSide?: React.ReactNode;
  wide?: boolean;
  showHistory?: boolean;
  showSeedPanel?: boolean;
}) {
  const { session } = useSession();
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Link
            href="/"
            className="grid size-9 shrink-0 place-items-center rounded-lg border border-line/70 bg-[#1a2c38] text-muted transition hover:bg-[#213743] hover:text-white"
            aria-label="Back to games"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <GameIcon icon={game.icon} accent={game.accent} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl font-bold tracking-tight sm:text-2xl">{game.name}</h1>
              <span className="rounded bg-white/[0.06] px-1.5 py-0.5 text-[9px] font-bold text-muted">{game.rtp} RTP</span>
            </div>
            <p className="mt-0.5 hidden text-[11px] text-muted sm:block">{game.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="hidden rounded-lg border border-line/70 bg-[#1a2c38] px-3 py-2 text-[10px] font-semibold text-muted sm:block">
            Balance <span className="ml-1 text-balance text-xs font-bold text-white">{formatCents(session.wallet.balanceCents)}</span>
          </span>
          <Link
            href="/fairness"
            className="flex h-9 items-center gap-1.5 rounded-lg border border-line/70 bg-[#1a2c38] px-3 text-[10px] font-semibold text-muted transition hover:text-white"
          >
            <ShieldCheck className="size-3.5 text-green" /> Fairness
          </Link>
        </div>
      </div>

      <div className={cn("grid items-start gap-3", wide ? "xl:grid-cols-[300px_minmax(0,1fr)]" : "xl:grid-cols-[300px_minmax(0,1fr)_268px]")}>
        <div className="min-w-0 space-y-3">
          {controls}
          {showSeedPanel ? <SeedPanel /> : null}
        </div>
        <div className="min-w-0 space-y-3">
          {stage}
          {showHistory ? <HistoryTable gameId={game.id} /> : null}
        </div>
        {!wide ? (
          <div className="hidden xl:block">
            <div className="sticky top-24">
              <LiveBets limit={20} />
            </div>
          </div>
        ) : null}
      </div>

      {mobileSide ? <div className="xl:hidden">{mobileSide}</div> : null}
    </div>
  );
}
