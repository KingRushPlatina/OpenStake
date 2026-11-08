"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Wallet } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { limboMultiplierAtElapsed } from "@/lib/limbo";
import { useSession } from "@/components/session-provider";
import { GameShell } from "@/components/games/game-shell";
import {
  BetAmountControl,
  ControlPanel,
  PlayButton,
  Stage,
  StatTile,
  useBetAmount,
} from "@/components/games/controls";
import { useGameResult } from "@/components/games/use-game-result";
import { useProgressionBet } from "@/components/games/use-progression-bet";
import { LimboFlight, type LimboPhase } from "./limbo-flight";
import { useLimboClock } from "./use-limbo-clock";

type LimboPublic = {
  multiplier: number;
  startedAtMs?: number;
  growthMs?: number;
  cashoutAllowed?: boolean;
  crash?: number;
  lost?: boolean;
};

type RecentCrash = { id: string; crash: number };

type StatusPayload = { active: PublicBet; serverNowMs?: number };

function LimboActionPanel({
  active,
  settled,
  startedAtMs,
  offsetRef,
  stakeCents,
  amountCents,
  valid,
  starting,
  cashing,
  finalPayoutCents,
  onStart,
  onCashout,
}: {
  active: boolean;
  settled: boolean;
  startedAtMs?: number;
  offsetRef: { current: number };
  stakeCents: number;
  amountCents: number;
  valid: boolean;
  starting: boolean;
  cashing: boolean;
  finalPayoutCents: number;
  onStart: () => void;
  onCashout: () => void;
}) {
  const live = useLimboClock(active ? startedAtMs : undefined, offsetRef);
  const cashoutCents = active ? Math.floor(stakeCents * live) : settled ? finalPayoutCents : stakeCents;
  const profit = cashoutCents - stakeCents;
  const busy = starting || cashing;

  return (
    <>
      <div className="grid grid-cols-2 gap-2">
        <StatTile
          label="Cashout now"
          value={formatCents(cashoutCents)}
          tone={active ? "text-green" : undefined}
        />
        <StatTile
          label="Profit now"
          value={`${profit >= 0 ? "+" : ""}${formatCents(profit)}`}
          tone={profit > 0 ? "text-green" : undefined}
        />
      </div>
      {active ? (
        <button
          type="button"
          onClick={onCashout}
          disabled={cashing}
          className="limbo-cashout group relative hidden h-16 w-full flex-col items-center justify-center gap-0.5 overflow-hidden rounded-xl border border-green/40 bg-gradient-to-b from-[#33b984] to-[#1b7d57] text-[#05120c] shadow-[0_12px_34px_rgba(79,211,155,0.24)] transition hover:from-[#43cb92] hover:to-[#229368] disabled:opacity-60 xl:flex"
        >
          <span className="text-[9px] font-bold uppercase tracking-[0.16em] opacity-70">
            Cash out {formatMultiplier(live)}
          </span>
          <span className="font-display text-2xl leading-none tabular-nums">{formatCents(cashoutCents)}</span>
          <Wallet className="absolute right-3 top-3 size-4 opacity-45" />
        </button>
      ) : (
        <PlayButton onClick={onStart} disabled={!valid || busy}>
          {busy ? "Starting…" : settled ? "Fly again" : `Bet ${formatCents(amountCents)} & fly`}
        </PlayButton>
      )}
    </>
  );
}

function LimboSceneCashout({
  startedAtMs,
  offsetRef,
  stakeCents,
  cashing,
  onCashout,
}: {
  startedAtMs?: number;
  offsetRef: { current: number };
  stakeCents: number;
  cashing: boolean;
  onCashout: () => void;
}) {
  const live = useLimboClock(startedAtMs, offsetRef);
  return (
    <button
      type="button"
      onClick={onCashout}
      disabled={cashing}
      className="limbo-cashout group relative flex h-14 w-full items-center justify-center gap-3 overflow-hidden rounded-xl border border-green/40 bg-gradient-to-b from-[#33b984] to-[#1b7d57] text-[#05120c] shadow-[0_12px_34px_rgba(79,211,155,0.24)] transition hover:from-[#43cb92] hover:to-[#229368] disabled:opacity-60"
    >
      <Wallet className="size-4 opacity-60" />
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] opacity-75">Cash out</span>
      <span className="font-display text-xl leading-none tabular-nums">{formatCents(Math.floor(stakeCents * live))}</span>
      <span className="text-[10px] font-semibold tabular-nums opacity-60">{formatMultiplier(live)}</span>
    </button>
  );
}

export function LimboGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const { activeBet, setActiveBet, serverNowMs } = useProgressionBet(game.id);
  const result = useGameResult(game.name);
  const [recent, setRecent] = useState<RecentCrash[]>([]);
  const offsetRef = useRef(0);

  const state = activeBet?.result as LimboPublic | undefined;
  const isActive = activeBet?.status === "active";
  const settled = activeBet?.status === "settled";
  const lost = settled && Boolean(state?.lost);
  const crashPoint = state?.crash;
  const startedAtMs = state?.startedAtMs;
  const phase: LimboPhase = isActive ? "flying" : settled ? (lost ? "crashed" : "cashed") : "idle";
  const settledMultiplier = settled
    ? Math.max(1, lost ? (crashPoint ?? 1) : (state?.multiplier ?? 1))
    : 1;
  const stakeCents = activeBet?.amountCents ?? amountCents;
  const finalPayoutCents = settled ? (activeBet?.payoutCents ?? 0) : 0;

  useEffect(() => {
    if (typeof serverNowMs === "number") offsetRef.current = serverNowMs - Date.now();
  }, [serverNowMs]);

  useEffect(() => {
    let cancelled = false;
    apiFetch<{ history: PublicBet[] }>("/api/history?game=limbo&limit=12")
      .then((payload) => {
        if (cancelled) return;
        const rounds: RecentCrash[] = [];
        for (const bet of payload.history) {
          const crash = (bet.result as LimboPublic).crash;
          if (typeof crash === "number") rounds.push({ id: bet.id, crash });
        }
        if (!rounds.length) return;
        setRecent((previous) => {
          const known = new Set(previous.map((item) => item.id));
          return [...previous, ...rounds.filter((item) => !known.has(item.id))].slice(0, 12);
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const noteRound = useCallback((bet: PublicBet) => {
    if (bet.status !== "settled") return;
    const data = bet.result as LimboPublic;
    if (typeof data.crash !== "number") return;
    const crash = data.crash;
    setRecent((previous) =>
      previous.some((item) => item.id === bet.id)
        ? previous
        : [{ id: bet.id, crash }, ...previous].slice(0, 12),
    );
  }, []);

  const syncStatus = useCallback(
    async (betId: string) => {
      try {
        const payload = await apiFetch<StatusPayload>(`/api/games/limbo/${betId}/status`);
        if (typeof payload.serverNowMs === "number") {
          offsetRef.current = payload.serverNowMs - Date.now();
        }
        if (payload.active.status === "settled") {
          setActiveBet(payload.active);
          result.onResult(payload.active);
          noteRound(payload.active);
        }
      } catch {
        // Transient network error; the polling loop will retry.
      }
    },
    [noteRound, result, setActiveBet],
  );

  const start = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet & { serverNowMs?: number }>("/api/games/limbo/start", {
        method: "POST",
        body: JSON.stringify({ amountCents, input: {}, idempotencyKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      if (typeof bet.serverNowMs === "number") offsetRef.current = bet.serverNowMs - Date.now();
      setActiveBet(bet);
      result.onResult(bet);
      noteRound(bet);
    },
    onError: result.onError,
  });

  const cashout = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>(`/api/games/limbo/${activeBet?.id}/action`, {
        method: "POST",
        body: JSON.stringify({ action: { type: "cashout" }, actionKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setActiveBet(bet);
      result.onResult(bet);
      noteRound(bet);
    },
    onError: (error) => {
      // The plane may have crashed a few milliseconds before the click landed.
      if (error instanceof ApiError && (error.code === "GAME_STATE" || error.code === "NOT_FOUND")) {
        if (activeBet?.id) void syncStatus(activeBet.id);
        return;
      }
      result.onError(error);
    },
  });

  const activeBetId = isActive ? activeBet?.id : undefined;
  const onResult = result.onResult;
  useEffect(() => {
    if (!activeBetId) return;
    let cancelled = false;
    let timer = 0;

    const poll = async () => {
      try {
        const payload = await apiFetch<StatusPayload>(`/api/games/limbo/${activeBetId}/status`);
        if (cancelled) return;
        if (typeof payload.serverNowMs === "number") {
          offsetRef.current = payload.serverNowMs - Date.now();
        }
        if (payload.active.status === "settled") {
          setActiveBet(payload.active);
          onResult(payload.active);
          noteRound(payload.active);
          return;
        }
      } catch {
        // Keep flying through transient errors.
      }
      if (cancelled) return;
      const elapsed = startedAtMs ? Date.now() + offsetRef.current - startedAtMs : 0;
      const multiplier = limboMultiplierAtElapsed(elapsed);
      timer = window.setTimeout(poll, multiplier >= 10 ? 80 : multiplier >= 3 ? 130 : 220);
    };

    timer = window.setTimeout(poll, 120);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [activeBetId, noteRound, onResult, setActiveBet, startedAtMs]);

  return (
    <GameShell
      game={game}
      controls={
        <ControlPanel title="Flight deck">
          <BetAmountControl
            game={game}
            balanceCents={session.wallet.balanceCents}
            amount={amount}
            setAmount={setAmount}
            disabled={isActive || start.isPending || cashout.isPending}
          />
          <LimboActionPanel
            active={isActive}
            settled={settled}
            startedAtMs={startedAtMs}
            offsetRef={offsetRef}
            stakeCents={stakeCents}
            amountCents={amountCents}
            valid={valid}
            starting={start.isPending}
            cashing={cashout.isPending}
            finalPayoutCents={finalPayoutCents}
            onStart={() => start.mutate()}
            onCashout={() => cashout.mutate()}
          />
          <p className="text-center text-[9px] leading-4 text-muted/50">
            {isActive
              ? "No target, no minimum. Cash out whenever you like."
              : settled
                ? lost
                  ? "It went down. Every flight is a fresh draw."
                  : "You jumped out in time. Run it again."
                : "The plane lifts off and the multiplier climbs. Bail out before it crashes."}
          </p>
        </ControlPanel>
      }
      stage={
        <Stage
          label="Limbo runway"
          status={
            <span
              className={cn(
                "rounded-full border px-2.5 py-1 text-[9px] font-medium tabular-nums",
                isActive
                  ? "border-[#c3a9ec]/30 bg-[#c3a9ec]/10 text-[#c3a9ec]"
                  : settled
                    ? lost
                      ? "border-red/30 bg-red/10 text-red"
                      : "border-green/30 bg-green/10 text-green"
                    : "border-line/60 text-muted",
              )}
            >
              {isActive
                ? "In flight"
                : settled
                  ? lost
                    ? `Crashed at ${formatMultiplier(crashPoint ?? 0)}`
                    : `Cashed at ${formatMultiplier(state?.multiplier ?? 1)}`
                  : "Ready for takeoff"}
            </span>
          }
          footer={
            <div className="flex items-center justify-between gap-3 text-[10px]">
              <span className="text-muted/60">
                Stake <span className="ml-1 font-medium tabular-nums text-ink">{formatCents(stakeCents)}</span>
              </span>
              <span className="text-muted/60">
                Last flight{" "}
                <span className="ml-1 font-medium tabular-nums text-ink">
                  {recent[0] ? formatMultiplier(recent[0].crash) : "—"}
                </span>
              </span>
              <span className="text-muted/60">
                RTP <span className="ml-1 font-medium text-ink">99%</span>
              </span>
            </div>
          }
        >
          <div className="mx-auto max-w-[720px]">
            <LimboFlight
              key={activeBet?.id ?? "idle"}
              active={isActive}
              startedAtMs={startedAtMs}
              offsetRef={offsetRef}
              settledMultiplier={settledMultiplier}
              phase={phase}
              roundKey={activeBet?.id ?? "idle"}
            />

            {isActive ? (
              <div className="mt-3 xl:hidden">
                <LimboSceneCashout
                  startedAtMs={startedAtMs}
                  offsetRef={offsetRef}
                  stakeCents={stakeCents}
                  cashing={cashout.isPending}
                  onCashout={() => cashout.mutate()}
                />
              </div>
            ) : null}

            <div className="mt-4 flex items-center gap-3">
              <span className="shrink-0 text-[8px] font-semibold uppercase tracking-[0.18em] text-muted/40">
                Recent flights
              </span>
              <div className="flex flex-1 gap-1.5 overflow-hidden">
                {recent.length > 0 ? (
                  recent.slice(0, 9).map((round) => (
                    <span
                      key={round.id}
                      className={cn(
                        "shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-medium tabular-nums",
                        round.crash >= 2
                          ? "border-gold/25 bg-gold/[0.07] text-gold/85"
                          : "border-red/20 bg-red/[0.06] text-red/75",
                      )}
                    >
                      {formatMultiplier(round.crash)}
                    </span>
                  ))
                ) : (
                  <span className="text-[9px] text-muted/35">No flights on this account yet.</span>
                )}
              </div>
            </div>
          </div>
        </Stage>
      }
    />
  );
}
