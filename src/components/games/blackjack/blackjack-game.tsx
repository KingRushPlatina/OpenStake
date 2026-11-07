"use client";

import { useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, Spade } from "lucide-react";
import { toast } from "sonner";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import {
  BLACKJACK_CHIPS_CENTS,
  BLACKJACK_MAX_SPOTS,
  type BlackjackAction,
  type BlackjackState,
} from "@/types/blackjack";
import { apiFetch } from "@/lib/api-client";
import { newRequestKey } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { Badge } from "@/components/ui/badge";
import { LiveBets } from "@/components/casino/live-bets";
import { TopUpNotice } from "@/components/casino/top-up-notice";
import { useFaucetClaim } from "@/components/casino/use-faucet-claim";
import { useGameResult } from "@/components/games/use-game-result";
import { useProgressionBet } from "@/components/games/use-progression-bet";
import { BlackjackTable } from "./blackjack-table";
import { RecentHands } from "./recent-hands";
import { FairnessCard, RulesCard } from "./side-cards";

function emptySpots() {
  return Array.from({ length: BLACKJACK_MAX_SPOTS }, () => [] as number[]);
}

function spotsTotal(spots: number[][]) {
  return spots.reduce((total, chips) => total + chips.reduce((sum, chip) => sum + chip, 0), 0);
}

function activeSpots(spots: number[][]) {
  return spots.map((chips) => chips.reduce((sum, chip) => sum + chip, 0)).filter((amount) => amount > 0);
}

export function BlackjackGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const tableRef = useRef<HTMLDivElement>(null);
  const [spots, setSpots] = useState<number[][]>(emptySpots);
  const [lastSpots, setLastSpots] = useState<number[][] | null>(null);
  const [selectedChip, setSelectedChip] = useState<number>(BLACKJACK_CHIPS_CENTS[2]);
  const { activeBet, setActiveBet } = useProgressionBet(game.id);
  const result = useGameResult("Blackjack");
  const claim = useFaucetClaim();
  const state = activeBet?.result as BlackjackState | undefined;
  const isActive = activeBet?.status === "active";
  const settled = activeBet?.status === "settled";
  const balance = session.wallet.balanceCents;
  const activeHand = state?.hands[state.activeHand];
  const totalOnTable = spotsTotal(spots);
  const boxCount = activeSpots(spots).length;
  const totalStake = state?.totalStake ?? activeBet?.amountCents ?? totalOnTable;
  const net = activeBet ? activeBet.payoutCents - activeBet.amountCents : 0;

  const availableActions = (state?.availableActions ?? []).filter((action) => {
    if (action === "double" || action === "split") return Boolean(activeHand) && balance >= (activeHand?.betCents ?? 0);
    if (action === "take-insurance") return balance >= Math.floor(totalStake / 2);
    return true;
  });

  const start = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/blackjack/start", {
        method: "POST",
        body: JSON.stringify({
          amountCents: totalOnTable,
          input: { spots: activeSpots(spots) },
          idempotencyKey: newRequestKey(),
        }),
      }),
    onSuccess: (bet) => {
      setLastSpots(spots.map((chips) => [...chips]));
      setSpots(emptySpots());
      setActiveBet(bet);
      result.onResult(bet);
      if (window.matchMedia("(max-width: 1279px)").matches) {
        window.setTimeout(() => tableRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 80);
      }
    },
    onError: result.onError,
  });

  const act = useMutation({
    mutationFn: (action: BlackjackAction) =>
      apiFetch<PublicBet>(`/api/games/blackjack/${activeBet?.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: { type: action }, actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
    },
    onError: result.onError,
  });

  const busy = start.isPending || act.isPending;

  useEffect(() => {
    if (!isActive || state?.phase !== "player" || busy) return;
    const handler = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      if (event.repeat || event.metaKey || event.ctrlKey || event.altKey) return;
      const map: Record<string, BlackjackAction> = { h: "hit", s: "stand", d: "double", p: "split" };
      const action = map[event.key.toLowerCase()];
      if (action && availableActions.includes(action)) act.mutate(action);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [act, availableActions, busy, isActive, state?.phase]);

  const placeChip = (index: number) => {
    if (isActive || settled || busy) return;
    if (selectedChip > balance) {
      toast.error("Not enough credits", { description: `Top up to place a ${formatCents(selectedChip)} chip.` });
      return;
    }
    setSpots((previous) => previous.map((chips, chipIndex) => (chipIndex === index ? [...chips, selectedChip] : chips)));
  };

  const clearSpot = (index: number) => {
    setSpots((previous) => previous.map((chips, chipIndex) => (chipIndex === index ? [] : chips)));
  };

  const undo = () => {
    setSpots((previous) => {
      const next = previous.map((chips) => [...chips]);
      for (let index = next.length - 1; index >= 0; index -= 1) {
        if (next[index].length > 0) {
          next[index].pop();
          break;
        }
      }
      return next;
    });
  };

  const rebet = () => {
    const source =
      lastSpots && lastSpots.length > 0
        ? lastSpots
        : (state?.hands ?? []).map((hand) => [hand.betCents]);
    if (source.length === 0) return;
    const next = emptySpots();
    source.slice(0, BLACKJACK_MAX_SPOTS).forEach((chips, index) => {
      next[index] = [...chips];
    });
    setSpots(next);
    setActiveBet(null);
  };

  const displayedStake = isActive || settled ? totalStake : totalOnTable;
  const displayedBoxes = isActive || settled ? state?.hands.length ?? boxCount : boxCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/#games" className="grid size-8 place-items-center rounded-full border border-line text-muted transition hover:border-line-strong hover:text-ink" aria-label="Back to originals">
              <ArrowLeft className="size-3.5" />
            </Link>
            <div className="flex items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.22em] text-muted/55">
              <Spade className="size-3 text-gold" />
              OpenStake Originals · Table 01
            </div>
          </div>
          <h1 className="mt-3 text-4xl text-ink sm:text-5xl">
            Blackjack <span className="italic text-gold/80">No. 01</span>
          </h1>
          <p className="mt-2 max-w-md text-[11px] leading-5 text-muted/55">
            Cash-style chips from $1 to $1,000. Stack up to four boxes, then play each hand out against the dealer.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="gold">3:2 blackjack</Badge>
          <Badge>6 decks · S17</Badge>
          <Badge>4 boxes</Badge>
        </div>
      </div>

      <TopUpNotice minBetCents={game.minBetCents} />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <aside className="order-2 space-y-4 xl:order-2 xl:sticky xl:top-[96px] xl:self-start">
          <section className="surface p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/55">Your seat</p>
                <p className="mt-1 text-[13px] font-medium text-ink">{session.user.name}</p>
              </div>
              <span className="rounded-full border border-green/20 bg-green/10 px-2.5 py-1 text-[9px] font-semibold text-green">Guest</span>
            </div>

            <div className="mt-5 border-t border-line/60 pt-5">
              <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/55">Available</p>
              <p className="mt-1 font-display text-[38px] leading-none text-ink">{formatCents(balance)}</p>
              <p className="mt-1.5 text-[10px] text-muted/50">Virtual credits · no cash value</p>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-2.5">
              <div className="rounded-xl border border-line/60 bg-surface-2/60 px-3 py-2.5">
                <p className="text-[8px] uppercase tracking-[0.16em] text-muted/45">On the table</p>
                <p className="mt-1 text-[13px] font-semibold text-ink tabular-nums">{formatCents(displayedStake)}</p>
              </div>
              <div className="rounded-xl border border-line/60 bg-surface-2/60 px-3 py-2.5">
                <p className="text-[8px] uppercase tracking-[0.16em] text-muted/45">{isActive || settled ? "Hands" : "Boxes"}</p>
                <p className="mt-1 text-[13px] font-semibold text-ink tabular-nums">
                  {displayedBoxes || 0}
                  {isActive || settled ? "" : ` / ${BLACKJACK_MAX_SPOTS}`}
                </p>
              </div>
              <div className="rounded-xl border border-gold/20 bg-gold/[0.05] px-3 py-2.5">
                <p className="text-[8px] uppercase tracking-[0.16em] text-gold/50">Max return</p>
                <p className="mt-1 text-[13px] font-semibold text-gold tabular-nums">{formatCents(Math.floor(displayedStake * 2.5))}</p>
              </div>
              <div className="rounded-xl border border-line/60 bg-surface-2/60 px-3 py-2.5">
                <p className="text-[8px] uppercase tracking-[0.16em] text-muted/45">{settled ? "Last result" : "Table max"}</p>
                <p className={cnResult(settled ? net : 0, settled)}>{settled ? (net > 0 ? `+${formatCents(net)}` : formatCents(net)) : "No limit"}</p>
              </div>
            </div>

            <div className="mt-4 rounded-xl border border-line/60 bg-[#08110d] px-3.5 py-3">
              <div className="flex items-center justify-between text-[9px]">
                <span className="uppercase tracking-[0.16em] text-muted/45">Table minimum</span>
                <span className="font-medium text-ink/80">{formatCents(game.minBetCents)} / box</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px]">
                <span className="uppercase tracking-[0.16em] text-muted/45">Table maximum</span>
                <span className="font-medium text-ink/80">No limit</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px]">
                <span className="uppercase tracking-[0.16em] text-muted/45">Blackjack pays</span>
                <span className="font-medium text-gold/90">3:2</span>
              </div>
              <div className="mt-2 flex items-center justify-between text-[9px]">
                <span className="uppercase tracking-[0.16em] text-muted/45">Insurance</span>
                <span className="font-medium text-ink/80">2:1</span>
              </div>
            </div>

            <div className="mt-4 flex items-center justify-between rounded-xl border border-line/60 bg-surface-2/60 px-3.5 py-3">
              <div>
                <p className="text-[9px] uppercase tracking-[0.16em] text-muted/50">Chips on felt</p>
                <p className="mt-1 text-[13px] font-semibold text-ink tabular-nums">{formatCents(isActive || settled ? totalStake : totalOnTable)}</p>
              </div>
              <div className="text-right">
                <p className="text-[9px] uppercase tracking-[0.16em] text-muted/50">{settled ? "Returned" : "Table max"}</p>
                <p className="mt-1 text-[13px] font-semibold text-gold tabular-nums">{settled ? formatCents(activeBet?.payoutCents ?? 0) : "No limit"}</p>
              </div>
            </div>
          </section>

          <div className="hidden space-y-4 xl:block">
            <RulesCard />
            <FairnessCard serverSeedHash={session.seed?.serverSeedHash} nonce={session.seed?.nonce} />
          </div>
        </aside>

        <div className="order-1 min-w-0 space-y-5 xl:order-1">
          <div ref={tableRef} className="scroll-mt-24">
            <BlackjackTable
              state={state}
              activeBet={activeBet}
              isActive={Boolean(isActive)}
              settled={Boolean(settled)}
              busy={busy}
              spots={spots}
              selectedChip={selectedChip}
              balanceCents={balance}
              net={net}
              availableActions={availableActions}
              onAction={(action) => act.mutate(action)}
              onSelectChip={setSelectedChip}
              onPlaceChip={placeChip}
              onClearSpot={clearSpot}
              onUndo={undo}
              onClearAll={() => setSpots(emptySpots())}
              onDeal={() => start.mutate()}
              onRebet={rebet}
              onNewBet={() => {
                setSpots(emptySpots());
                setActiveBet(null);
              }}
              onReload={() => claim.mutate()}
              reloading={claim.isPending}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:hidden">
            <RulesCard />
            <FairnessCard serverSeedHash={session.seed?.serverSeedHash} nonce={session.seed?.nonce} />
          </div>

          <div className="grid items-start gap-5 lg:grid-cols-[1.5fr_1fr]">
            <RecentHands />
            <LiveBets limit={8} />
          </div>
        </div>
      </div>
    </div>
  );
}

function cnResult(cents: number, settled: boolean) {
  if (!settled) return "mt-1 text-[13px] font-semibold text-ink/80 tabular-nums";
  return cents > 0
    ? "mt-1 text-[13px] font-semibold text-green tabular-nums"
    : cents < 0
      ? "mt-1 text-[13px] font-semibold text-red/80 tabular-nums"
      : "mt-1 text-[13px] font-semibold text-ink tabular-nums";
}
