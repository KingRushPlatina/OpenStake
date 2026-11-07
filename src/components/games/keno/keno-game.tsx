"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Dices, RotateCcw } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GameShell } from "@/components/games/game-shell";
import {
  BetAmountControl,
  ControlPanel,
  PlayButton,
  SegmentedControl,
  Stage,
  StatTile,
  useBetAmount,
} from "@/components/games/controls";
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
  const result = useGameResult(game.name);

  const table = getKenoPaytable(Math.max(picks.length, 1), risk);
  const maxPayout = Math.max(...table);

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/keno/play", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          input: { picks: [...picks].sort((left, right) => left - right), risk },
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

  const randomPicks = () => {
    const pool = Array.from({ length: 40 }, (_, index) => index + 1);
    for (let index = pool.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [pool[index], pool[swap]] = [pool[swap], pool[index]];
    }
    setPicks(pool.slice(0, 8).sort((left, right) => left - right));
  };

  return (
    <GameShell
      game={game}
      controls={
        <ControlPanel title="Pick your numbers">
          <BetAmountControl
            game={game}
            balanceCents={session.wallet.balanceCents}
            amount={amount}
            setAmount={setAmount}
            disabled={mutation.isPending}
          />
          <div>
            <p className="mb-2 text-[10px] font-medium text-muted">Risk</p>
            <SegmentedControl
              value={risk}
              onChange={setRisk}
              disabled={mutation.isPending}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Med" },
                { value: "high", label: "High" },
              ]}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Selected" value={`${picks.length}/10`} tone="text-gold" />
            <StatTile label="Top payout" value={formatMultiplier(maxPayout)} />
          </div>
          <div className="max-h-40 space-y-1 overflow-y-auto pr-1">
            {tableForDisplay.map((entry) => (
              <div key={entry.hitCount} className="flex items-center justify-between rounded-lg border border-line/40 px-2.5 py-1.5 text-[10px]">
                <span className="text-muted/65">
                  {entry.hitCount} {entry.hitCount === 1 ? "hit" : "hits"}
                </span>
                <span className="font-medium text-ink">{formatMultiplier(entry.value)}</span>
              </div>
            ))}
            {tableForDisplay.length === 0 ? <p className="py-2 text-[10px] text-muted/55">Select numbers to see the paytable.</p> : null}
          </div>
          <PlayButton disabled={!valid || picks.length === 0 || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending ? "Drawing…" : "Play Keno"}
          </PlayButton>
        </ControlPanel>
      }
      stage={
        <Stage
          label="Keno board"
          status={
            kenoResult ? (
              <span className={cn("rounded-full border px-2.5 py-1 text-[9px] font-medium", kenoResult.hitCount > 0 ? "border-green/30 bg-green/10 text-green" : "border-line/60 text-muted")}>
                {kenoResult.hitCount} hits · {formatCents(lastBet?.payoutCents ?? 0)}
              </span>
            ) : (
              <span className="rounded-full border border-line/60 px-2.5 py-1 text-[9px] font-medium text-muted">Pick 1–10 numbers</span>
            )
          }
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2 text-[10px]">
              <span className="text-muted/60">
                Hits <span className="ml-1 font-medium text-ink">{kenoResult?.hits.join(", ") || "—"}</span>
              </span>
              <span className="text-muted/60">
                Drawn <span className="ml-1 font-medium text-muted">{kenoResult?.drawn.length ?? 0} of 40</span>
              </span>
            </div>
          }
        >
          <div className="mx-auto max-w-[760px]">
            <div className="grid grid-cols-8 gap-1.5">
              {Array.from({ length: 40 }, (_, index) => index + 1).map((number) => {
                const selected = picks.includes(number);
                const isDrawn = drawn.has(number);
                const isHit = hits.has(number);
                return (
                  <motion.button
                    key={number}
                    type="button"
                    whileTap={{ scale: 0.95 }}
                    onClick={() => togglePick(number)}
                    className={cn(
                      "relative grid aspect-square place-items-center rounded-lg border text-[11px] font-medium transition sm:text-xs",
                      isHit
                        ? "border-green/50 bg-green/15 text-green"
                        : isDrawn
                          ? "border-blue/35 bg-blue/10 text-[#9ec8e8]"
                          : selected
                            ? "border-gold/50 bg-gold/10 text-gold"
                            : "border-line/40 bg-bg/30 text-muted hover:border-line hover:text-ink",
                    )}
                  >
                    {number}
                    {selected && !isDrawn ? <span className="absolute right-1 top-1 size-1 rounded-full bg-gold" /> : null}
                  </motion.button>
                );
              })}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setPicks([])}
              disabled={mutation.isPending}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-line/60 px-3 text-[9px] font-medium text-muted transition hover:text-ink disabled:opacity-40"
            >
              <RotateCcw className="size-3" /> Clear
            </button>
            <button
              type="button"
              onClick={randomPicks}
              disabled={mutation.isPending}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-line/60 px-3 text-[9px] font-medium text-muted transition hover:text-ink disabled:opacity-40"
            >
              <Dices className="size-3" /> Random
            </button>
            <span className="ml-auto text-[9px] text-muted/45">
              {picks.length === 0 ? "No numbers selected" : `${picks.length} selected`}
            </span>
          </div>
        </Stage>
      }
    />
  );
}
