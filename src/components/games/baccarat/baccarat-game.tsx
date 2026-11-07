"use client";

import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Club, RotateCcw, Sparkles } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { useGameResult } from "@/components/games/use-game-result";
import { PlayingCard } from "@/components/games/playing-card";

type BaccaratResult = {
  player: string[];
  banker: string[];
  playerTotal: number;
  bankerTotal: number;
  playerThird: string | null;
  bankerThird: string | null;
  winner: "player" | "banker" | "tie";
  bets: { player: number; banker: number; tie: number };
  totalBet: number;
  totalPayout: number;
};

type Spot = "player" | "banker" | "tie";
const CHIPS = [1, 5, 25, 100];
const SPOT_LABELS: Record<Spot, string> = { player: "Player", banker: "Banker", tie: "Tie" };
const SPOT_PAYOUTS: Record<Spot, string> = { player: "1:1", banker: "0.95:1", tie: "8:1" };

export function BaccaratGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const [chip, setChip] = useState(5);
  const [chips, setChips] = useState<{ spot: Spot; amountCents: number }[]>([]);
  const [lastBet, setLastBet] = useState<PublicBet | null>(null);
  const result = useGameResult(game.id);

  const bets = useMemo(() => {
    const totals: Record<Spot, number> = { player: 0, banker: 0, tie: 0 };
    for (const entry of chips) totals[entry.spot] += entry.amountCents;
    return totals;
  }, [chips]);
  const totalBet = bets.player + bets.banker + bets.tie;
  const input = { player: bets.player, banker: bets.banker, tie: bets.tie };
  const valid = totalBet >= game.minBetCents && totalBet <= game.maxBetCents;
  const baccaratResult = lastBet?.result as BaccaratResult | undefined;

  const deal = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/baccarat/play", {
        method: "POST",
        body: JSON.stringify({ amountCents: totalBet, input, idempotencyKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setLastBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const addChip = (spot: Spot) => {
    if (deal.isPending) return;
    if (totalBet + chip * 100 > game.maxBetCents) return;
    setChips((current) => [...current, { spot, amountCents: chip * 100 }]);
  };

  return (
    <GamePageLayout
      game={game}
      controls={
        <section className="surface p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-semibold text-muted">Chip value</p>
            <span className="text-[10px] text-muted/60">Balance {formatCents(session.wallet.balanceCents)}</span>
          </div>
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {CHIPS.map((value) => (
              <button
                key={value}
                type="button"
                disabled={deal.isPending}
                onClick={() => setChip(value)}
                className={cn(
                  "flex h-11 flex-col items-center justify-center rounded-full border text-[10px] font-black transition disabled:opacity-40",
                  chip === value
                    ? "border-amber bg-amber/15 text-amber shadow-[0_0_16px_rgba(255,184,0,0.15)]"
                    : "border-line/60 bg-[#0f212e] text-muted hover:text-white",
                )}
              >
                <span className="text-[8px]">$</span>
                {value}
              </button>
            ))}
          </div>
          <div className="mt-4 space-y-2">
            {(["player", "banker", "tie"] as Spot[]).map((spot) => (
              <div key={spot} className="flex items-center justify-between rounded-lg bg-[#0f212e] px-3 py-2.5">
                <div>
                  <p className="text-[11px] font-semibold text-white">{SPOT_LABELS[spot]}</p>
                  <p className="text-[9px] text-muted/60">{SPOT_PAYOUTS[spot]}</p>
                </div>
                <p className={cn("font-mono text-xs font-bold", bets[spot] > 0 ? "text-amber" : "text-muted/30")}>{formatCents(bets[spot])}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between rounded-lg border border-line/50 bg-[#0f212e]/60 px-3 py-2">
            <span className="text-[10px] text-muted">Total bet</span>
            <span className="font-display text-base font-bold text-white">{formatCents(totalBet)}</span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={chips.length === 0 || deal.isPending}
              onClick={() => setChips((current) => current.slice(0, -1))}
              className="btn btn-secondary h-9 text-[10px]"
            >
              Undo
            </button>
            <button
              type="button"
              disabled={chips.length === 0 || deal.isPending}
              onClick={() => setChips([])}
              className="btn btn-secondary h-9 gap-1 text-[10px]"
            >
              <RotateCcw className="size-3" /> Clear
            </button>
          </div>
          <button type="button" className="btn btn-primary mt-3 w-full" disabled={!valid || deal.isPending} onClick={() => deal.mutate()}>
            {deal.isPending ? "Dealing…" : "Deal cards"}
          </button>
          {!valid && totalBet > 0 ? <p className="mt-2 text-[10px] text-red">Total bet must be between {formatCents(game.minBetCents)} and {formatCents(game.maxBetCents)}.</p> : null}
        </section>
      }
      stage={
        <section className="surface relative min-h-[500px] overflow-hidden p-4 sm:p-6">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(25,91,64,0.22),transparent_58%)]" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <Club className="size-3.5 text-blue" /> Baccarat
              </div>
              {baccaratResult ? (
                <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", baccaratResult.winner === "tie" ? "border-blue/30 bg-blue/10 text-blue" : "border-green/30 bg-green/10 text-green")}>
                  {baccaratResult.winner} wins · {formatCents(lastBet?.payoutCents ?? 0)}
                </div>
              ) : (
                <div className="rounded-full border border-line/60 bg-[#0f212e]/70 px-2.5 py-1 text-[9px] font-semibold text-muted">Punto banco</div>
              )}
            </div>

            <div className="mx-auto mt-6 max-w-[700px]">
              <div className="rounded-2xl border border-[#1f644b]/50 bg-gradient-to-br from-[#12382e] to-[#0b2721] p-4 shadow-[inset_0_0_60px_rgba(0,0,0,0.2)] sm:p-6">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { key: "player" as const, label: "Player", cards: baccaratResult?.player, total: baccaratResult?.playerTotal, active: baccaratResult?.winner === "player" },
                    { key: "banker" as const, label: "Banker", cards: baccaratResult?.banker, total: baccaratResult?.bankerTotal, active: baccaratResult?.winner === "banker" },
                  ].map((side, sideIndex) => (
                    <div key={side.key} className={cn("rounded-xl border p-3 transition", side.active ? "border-green/40 bg-green/[0.05]" : "border-white/10 bg-black/10")}>
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/80">{side.label}</p>
                        <p className="font-display text-2xl font-bold text-white">{side.total ?? "—"}</p>
                      </div>
                      <div className="mt-4 flex min-h-[110px] items-center justify-center gap-1.5">
                        {side.cards ? (
                          side.cards.map((card, index) => <PlayingCard key={`${card}-${index}`} card={card} size="md" delay={sideIndex * 0.1 + index * 0.08} />)
                        ) : (
                          <>
                            <PlayingCard hidden size="md" />
                            <PlayingCard hidden size="md" delay={0.1} />
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  {(["player", "banker", "tie"] as Spot[]).map((spot) => (
                    <button
                      key={spot}
                      type="button"
                      onClick={() => addChip(spot)}
                      disabled={deal.isPending}
                      className={cn(
                        "group relative flex h-16 flex-col items-center justify-center rounded-xl border transition disabled:opacity-50",
                        baccaratResult?.winner === spot
                          ? "border-green/50 bg-green/10"
                          : spot === "tie"
                            ? "border-blue/25 bg-blue/[0.05] hover:bg-blue/10"
                            : "border-white/15 bg-black/15 hover:border-amber/40 hover:bg-amber/[0.05]",
                      )}
                    >
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">{SPOT_LABELS[spot]}</span>
                      <span className="mt-0.5 text-[9px] text-muted">{SPOT_PAYOUTS[spot]}</span>
                      {bets[spot] > 0 ? (
                        <span className="absolute -right-1 -top-1 rounded-full bg-amber px-1.5 py-0.5 text-[8px] font-black text-[#1a1200]">{formatCents(bets[spot], { compact: true })}</span>
                      ) : null}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-center gap-2 text-[10px] text-muted">
                <Sparkles className="size-3 text-blue" />
                {baccaratResult
                  ? `${baccaratResult.winner === "tie" ? "Tie — Player and Banker push." : `${SPOT_LABELS[baccaratResult.winner]} wins.`} ${lastBet?.payoutCents ? `Payout ${formatCents(lastBet.payoutCents)}.` : "No winning bets."}`
                  : "Place chips on Player, Banker or Tie, then deal."}
              </div>
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Club className="size-4 text-blue" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Baccarat:</strong> Player and Banker push on a tie. Banker pays 0.95:1 after commission.
          </p>
        </div>
      }
    />
  );
}
