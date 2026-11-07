"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { CircleDot, Dices, RotateCcw, Sparkles } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { BetAmountControl, SegmentedControl, useBetAmount } from "@/components/games/bet-controls";
import { useGameResult } from "@/components/games/use-game-result";
import { getKenoPaytable, type KenoRisk } from "@/modules/games/paytables/keno";

type KenoResult = {
  picks: number[];
  drawn: number[];
  hits: number[];
  hitCount: number;
  risk: KenoRisk;
  payoutTable: number[];
};

export function KenoGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [risk, setRisk] = useState<KenoRisk>("medium");
  const [picks, setPicks] = useState<number[]>([]);
  const [lastBet, setLastBet] = useState<PublicBet | null>(null);
  const result = useGameResult(game.id);

  const table = getKenoPaytable(Math.max(picks.length, 1), risk);
  const maxPayout = Math.max(...table);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/keno/play", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          input: { picks: picks.sort((left, right) => left - right), risk },
          idempotencyKey: newRequestKey(),
        }),
      }),
    onSuccess: (bet) => {
      setLastBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const kenoResult = lastBet?.result as KenoResult | undefined;
  const drawn = new Set(kenoResult?.drawn ?? []);
  const hits = new Set(kenoResult?.hits ?? []);
  const tableForDisplay = useMemo(() => {
    if (!picks.length) return [];
    return table.map((value, hitCount) => ({ hitCount, value })).filter((entry) => entry.value > 0);
  }, [picks.length, table]);

  const togglePick = (number: number) => {
    if (mutation.isPending) return;
    setPicks((current) => {
      if (current.includes(number)) return current.filter((item) => item !== number);
      if (current.length >= 10) return current;
      return [...current, number];
    });
  };

  return (
    <GamePageLayout
      game={game}
      controls={
        <section className="surface p-4">
          <BetAmountControl game={game} balanceCents={session.wallet.balanceCents} amount={amount} setAmount={setAmount} disabled={mutation.isPending} />
          <div className="my-4 h-px bg-line/60" />
          <p className="mb-2 text-[11px] font-semibold text-muted">Risk</p>
          <SegmentedControl
            value={risk}
            onChange={setRisk}
            disabled={mutation.isPending}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
          <div className="mt-4 flex items-center justify-between rounded-lg bg-[#0f212e] p-3">
            <div>
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Selected</p>
              <p className="mt-0.5 font-display text-lg font-bold text-green">{picks.length}<span className="text-xs text-muted">/10</span></p>
            </div>
            <div className="text-right">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Top payout</p>
              <p className="mt-0.5 font-display text-lg font-bold text-white">{formatMultiplier(maxPayout)}</p>
            </div>
          </div>
          <div className="mt-3 max-h-[188px] space-y-1 overflow-y-auto">
            {tableForDisplay.map((entry) => (
              <div key={entry.hitCount} className="flex items-center justify-between rounded-md bg-[#0f212e]/70 px-2.5 py-1.5 text-[10px]">
                <span className="text-muted">{entry.hitCount} {entry.hitCount === 1 ? "hit" : "hits"}</span>
                <span className="font-bold text-white">{formatMultiplier(entry.value)}</span>
              </div>
            ))}
            {picks.length === 0 || tableForDisplay.length === 0 ? <p className="px-1 py-2 text-[10px] text-muted/60">Select numbers to see the paytable.</p> : null}
          </div>
          <button type="button" className="btn btn-primary mt-4 w-full" disabled={!valid || picks.length === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Drawing…" : "Play Keno"}
          </button>
        </section>
      }
      stage={
        <section className="surface relative min-h-[430px] overflow-hidden p-4 sm:p-6">
          <div className="absolute right-0 top-0 size-64 rounded-full bg-green/10 blur-3xl" />
          <div className="relative">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <CircleDot className="size-3.5 text-green" /> Keno
              </div>
              {kenoResult ? (
                <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", kenoResult.hitCount >= 3 ? "border-green/30 bg-green/10 text-green" : "border-line bg-[#0f212e] text-muted")}>
                  {kenoResult.hitCount} hits · {formatCents(lastBet?.payoutCents ?? 0)}
                </div>
              ) : (
                <div className="rounded-full border border-line/60 bg-[#0f212e]/70 px-2.5 py-1 text-[9px] font-semibold text-muted">Pick 1–10 numbers</div>
              )}
            </div>

            <div className="mt-5 grid grid-cols-8 gap-1.5">
              {Array.from({ length: 40 }, (_, index) => index + 1).map((number) => {
                const selected = picks.includes(number);
                const isDrawn = drawn.has(number);
                const isHit = hits.has(number);
                return (
                  <button
                    key={number}
                    type="button"
                    onClick={() => togglePick(number)}
                    className={cn(
                      "relative grid aspect-square place-items-center rounded-lg border text-[11px] font-bold transition sm:text-xs",
                      isHit
                        ? "border-green bg-green text-[#071a0a] shadow-[0_0_18px_rgba(0,231,1,0.22)]"
                        : isDrawn
                          ? "border-blue/50 bg-blue/15 text-[#a5d6ff]"
                          : selected
                            ? "border-green/60 bg-green/10 text-green"
                            : "border-line/40 bg-[#0f212e] text-muted hover:border-line hover:text-white",
                    )}
                  >
                    {number}
                    {selected && !isDrawn ? <span className="absolute right-1 top-1 size-1 rounded-full bg-green" /> : null}
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setPicks([])}
                  className="btn btn-secondary h-8 gap-1.5 px-3 text-[10px]"
                  disabled={mutation.isPending}
                >
                  <RotateCcw className="size-3" /> Clear
                </button>
                <button
                  type="button"
                  onClick={() => setPicks(Array.from({ length: 8 }, () => 1 + Math.floor(Math.random() * 40)).filter((value, index, array) => array.indexOf(value) === index).slice(0, 10))}
                  className="btn btn-secondary h-8 gap-1.5 px-3 text-[10px]"
                  disabled={mutation.isPending}
                >
                  <Dices className="size-3" /> Random
                </button>
              </div>
              {lastBet && kenoResult ? (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-[11px]">
                  <Sparkles className={lastBet.payoutCents > lastBet.amountCents ? "size-3.5 text-green" : "size-3.5 text-muted"} />
                  <span className="text-muted">Your hits:</span>
                  <span className="font-semibold text-white">{kenoResult.hits.join(", ") || "none"}</span>
                </motion.div>
              ) : null}
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Sparkles className="size-4 text-green" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Keno:</strong> more picks raise the potential multiplier but make hits harder.
          </p>
        </div>
      }
    />
  );
}
