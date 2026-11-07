"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  Bell,
  Cherry,
  Citrus,
  Coins,
  Crown,
  Eye,
  Flame,
  Gem,
  Key,
  Sparkles,
  Star,
} from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { BetAmountControl, useBetAmount } from "@/components/games/bet-controls";
import { useGameResult } from "@/components/games/use-game-result";
import { slotConfigs, type SlotLineWin } from "@/modules/games/slots/slots";

const iconMap = {
  cherry: Cherry,
  citrus: Citrus,
  bell: Bell,
  seven: Crown,
  star: Star,
  sparkles: Sparkles,
  key: Key,
  gem: Gem,
  eye: Eye,
  crown: Crown,
  flame: Flame,
  ten: Coins,
  jack: Coins,
  queen: Coins,
  king: Coins,
  ace: Coins,
};

type SlotResult = {
  game: string;
  reels: string[][];
  lineWins: SlotLineWin[];
  lineMultiplier: number;
  scatterCount: number;
  scatterMultiplier: number;
  win: boolean;
};

function SymbolCell({ symbol, config, dim, highlight }: { symbol: string; config: (typeof slotConfigs)[keyof typeof slotConfigs]; dim?: boolean; highlight?: boolean }) {
  const definition = config.symbols.find((item) => item.id === symbol);
  const Icon = iconMap[(definition?.icon ?? "star") as keyof typeof iconMap] ?? Star;
  const isNumber = ["10", "J", "Q", "K", "A"].includes(symbol);
  const tone = definition?.tone ?? "text-white";
  return (
    <div
      className={cn(
        "relative flex aspect-square items-center justify-center overflow-hidden rounded-lg border transition sm:aspect-[1.05]",
        highlight ? "border-amber/70 bg-amber/10 shadow-[0_0_16px_rgba(255,184,0,0.12)]" : "border-white/[0.06] bg-[#0f212e]",
        dim && "opacity-40",
      )}
    >
      <span className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.06),transparent_65%)]" />
      {isNumber ? (
        <span className={cn("relative font-display text-lg font-black sm:text-xl", tone)}>{symbol}</span>
      ) : (
        <Icon className={cn("relative size-6 sm:size-7", tone)} strokeWidth={1.8} />
      )}
    </div>
  );
}

export function SlotGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const config = slotConfigs[game.id as "neon-fruits" | "golden-relic"];
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [lastBet, setLastBet] = useState<PublicBet | null>(null);
  const [displayReels, setDisplayReels] = useState<string[][] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const result = useGameResult(game.id);
  const slotResult = lastBet?.result as SlotResult | undefined;

  const fallbackReels = useMemo(
    () => config.strips.slice(0, 5).map((strip) => [strip[0], strip[1], strip[2]]),
    [config.strips],
  );

  const randomReels = () =>
    config.strips.map((strip) => {
      const stop = Math.floor(Math.random() * strip.length);
      return [strip[stop % strip.length], strip[(stop + 1) % strip.length], strip[(stop + 2) % strip.length]];
    });

  useEffect(() => () => setSpinning(false), []);

  const spin = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>(`/api/games/${game.id}/play`, {
        method: "POST",
        body: JSON.stringify({ amountCents, input: {}, idempotencyKey: newRequestKey() }),
      }),
    onMutate: () => {
      setSpinning(true);
      setDisplayReels(randomReels());
    },
    onSuccess: (bet) => {
      const payload = bet.result as SlotResult;
      setLastBet(bet);
      result.onResult(bet);
      window.setTimeout(() => {
        setDisplayReels(payload.reels);
        setSpinning(false);
      }, 850);
    },
    onError: (error) => {
      setSpinning(false);
      result.onError(error);
    },
  });

  const reels = displayReels ?? fallbackReels;
  const highlighted = new Set(slotResult?.lineWins.flatMap((win) => win.positions) ?? []);
  const scatterCount = slotResult?.scatterCount ?? 0;
  const winAmount = lastBet?.payoutCents ?? 0;
  const pending = spin.isPending || spinning;

  return (
    <GamePageLayout
      game={game}
      controls={
        <section className="surface p-4">
          <BetAmountControl game={game} balanceCents={session.wallet.balanceCents} amount={amount} setAmount={setAmount} disabled={pending} />
          <div className="my-4 h-px bg-line/60" />
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Paylines</p>
              <p className="mt-1 font-display text-lg font-bold text-white">20</p>
            </div>
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Max win</p>
              <p className="mt-1 font-display text-lg font-bold text-amber">5,000×</p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="rounded-md border border-line/50 bg-[#0f212e] px-2 py-1 text-[9px] font-semibold text-muted">WILD substitutes</span>
            <span className="rounded-md border border-line/50 bg-[#0f212e] px-2 py-1 text-[9px] font-semibold text-muted">SCATTER bonus</span>
            <span className="rounded-md border border-line/50 bg-[#0f212e] px-2 py-1 text-[9px] font-semibold text-muted">20 lines</span>
          </div>
          <button type="button" className="btn btn-primary mt-4 w-full" disabled={!valid || pending} onClick={() => spin.mutate()}>
            {spinning ? "Spinning…" : spin.isPending ? "Spinning…" : `Spin ${formatCents(amountCents)}`}
          </button>
          <p className="mt-3 text-center text-[10px] text-muted/65">Three or more scatters pay a bonus on the total bet.</p>
          <div className="mt-4 rounded-lg border border-line/50 bg-[#0f212e]/60 p-3">
            <p className="text-[9px] font-bold uppercase tracking-wider text-muted/55">Top line pays</p>
            <div className="mt-2 space-y-1 text-[10px]">
              <p className="flex justify-between"><span className="text-muted">Wild ×5</span><span className="font-bold text-white">{formatMultiplier((config.paytable.wild?.[2] ?? 0) / 20)}</span></p>
              <p className="flex justify-between"><span className="text-muted">Top symbol ×5</span><span className="font-bold text-white">{formatMultiplier((config.paytable[config.symbols[8].id]?.[2] ?? 0) / 20)}</span></p>
              <p className="flex justify-between"><span className="text-muted">Scatter ×5</span><span className="font-bold text-white">{formatMultiplier(config.scatterPays[5])}</span></p>
            </div>
          </div>
        </section>
      }
      stage={
        <section className="surface relative min-h-[500px] overflow-hidden p-4 sm:p-6">
          <div className={cn("absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl", game.id === "neon-fruits" ? "bg-pink/[0.07]" : "bg-amber/[0.07]")} />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <Sparkles className={cn("size-3.5", game.id === "neon-fruits" ? "text-pink" : "text-amber")} /> {config.name}
              </div>
              <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", winAmount > 0 && !spinning ? "border-green/30 bg-green/10 text-green" : "border-line/60 bg-[#0f212e] text-muted")}>
                {spinning ? "Reels spinning" : winAmount > 0 ? `${formatCents(winAmount)} win` : "20 paylines"}
              </div>
            </div>

            <div className="mx-auto mt-6 max-w-[620px] rounded-2xl border border-line/50 bg-gradient-to-b from-[#162b38] to-[#0f212e] p-3 shadow-[inset_0_0_50px_rgba(0,0,0,0.2)] sm:p-4">
              <div className="grid grid-cols-5 gap-1.5 sm:gap-2">
                {reels.map((reel, reelIndex) => (
                  <div key={reelIndex} className="grid gap-1.5 sm:gap-2">
                    {reel.map((symbol, rowIndex) => {
                      const position = reelIndex * 3 + rowIndex;
                      return (
                        <div key={`${reelIndex}-${rowIndex}`} className={cn(spinning && "animate-pulse")} style={{ animationDelay: `${(reelIndex * 3 + rowIndex) * 45}ms` }}>
                          <SymbolCell symbol={symbol} config={config} dim={spinning} highlight={!spinning && highlighted.has(position)} />
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>

            <div className="mx-auto mt-4 flex min-h-[50px] max-w-[620px] items-center justify-center">
              {spinning ? (
                <div className="flex items-center gap-2 text-[11px] text-muted">
                  <Sparkles className="size-4 animate-pulse text-amber" /> Watching the reels…
                </div>
              ) : slotResult && slotResult.win ? (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-xl border border-green/20 bg-green/[0.05] p-3 text-center">
                  <p className="font-display text-xl font-bold text-green">{formatCents(winAmount)}</p>
                  <p className="mt-0.5 text-[10px] text-muted">
                    {slotResult.lineWins.length} line {slotResult.lineWins.length === 1 ? "win" : "wins"}
                    {scatterCount >= 3 ? ` · ${scatterCount} scatters` : ""}
                  </p>
                </motion.div>
              ) : (
                <p className="text-[10px] text-muted">Five reels. Twenty lines. Wilds substitute for every symbol except the scatter.</p>
              )}
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Sparkles className="size-4 text-amber" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Slots:</strong> line wins pay from left to right. Scatters are evaluated anywhere on the reels.
          </p>
        </div>
      }
    />
  );
}
