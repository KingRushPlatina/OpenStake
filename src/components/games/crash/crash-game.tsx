"use client";

import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { Clock3, Rocket, ShieldCheck, Sparkles, Timer, Users } from "lucide-react";
import type { GameMetadata } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, avatarTone, initials } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { useClock } from "@/components/casino/use-clock";
import { useToast } from "@/components/toast-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { BetAmountControl, useBetAmount } from "@/components/games/bet-controls";
import { useCrash } from "./use-crash";
import { CrashGraph } from "./crash-graph";

function phaseLabel(phase: string) {
  if (phase === "betting") return "Betting open";
  if (phase === "running") return "Round live";
  return "Crashed";
}

export function CrashGame({ game }: { game: GameMetadata }) {
  const { session, setBalance, refresh } = useSession();
  const toast = useToast();
  const queryClient = useQueryClient();
  const { snapshot, connected } = useCrash();
  const now = useClock();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [autoEnabled, setAutoEnabled] = useState(false);
  const [autoCashout, setAutoCashout] = useState("2.00");

  const myPlayer = useMemo(
    () => snapshot?.players.find((player) => player.userId === session.user.id) ?? null,
    [snapshot?.players, session.user.id],
  );
  const phase = snapshot?.phase ?? "betting";
  const multiplier = snapshot?.multiplier ?? 1;
  const activeBet = myPlayer?.status === "active";
  const countdown =
    snapshot?.phaseEndsAt && now > 0 ? Math.max(0, Math.ceil((new Date(snapshot.phaseEndsAt).getTime() - now) / 1000)) : null;

  const place = useMutation({
    mutationFn: () =>
      apiFetch<{ betId: string; balance: number }>("/api/crash/bet", {
        method: "POST",
        body: JSON.stringify({
          amountCents,
          autoCashout: autoEnabled ? Number.parseFloat(autoCashout) : null,
        }),
      }),
    onSuccess: (result) => {
      setBalance(result.balance);
      toast.success("Crash bet placed", autoEnabled ? `Auto cashout at ${autoCashout}×.` : "Cash out before the crash.");
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (error) => toast.error("Could not place bet", error.message),
  });

  const cashout = useMutation({
    mutationFn: () => apiFetch<{ multiplier: number; payoutCents: number; balanceCents: number }>("/api/crash/cashout", { method: "POST" }),
    onSuccess: (result) => {
      setBalance(result.balanceCents);
      toast.success("Cashed out", `${formatMultiplier(result.multiplier)} · ${formatCents(result.payoutCents)}`);
      queryClient.invalidateQueries({ queryKey: ["session"] });
    },
    onError: (error) => toast.error("Cashout failed", error.message),
  });

  useEffect(() => {
    if (myPlayer?.status === "cashed" || myPlayer?.status === "lost") {
      refresh();
    }
  }, [myPlayer?.status, refresh]);

  const potential = activeBet && myPlayer ? Math.floor(myPlayer.amountCents * multiplier) : 0;
  const autoValid = !autoEnabled || (Number.parseFloat(autoCashout) >= 1.01 && Number.parseFloat(autoCashout) <= 1_000_000);
  const canPlace = phase === "betting" && !myPlayer && valid && autoValid && (snapshot?.roundId ?? "") !== "";

  const button = (() => {
    if (place.isPending || cashout.isPending) return { label: "Settling…", disabled: true, action: () => undefined };
    if (phase === "betting") {
      if (myPlayer) return { label: "Bet placed", disabled: true, action: () => undefined };
      return { label: `Place bet ${formatCents(amountCents)}`, disabled: !canPlace, action: () => place.mutate() };
    }
    if (phase === "running") {
      if (activeBet) return { label: `Cash out ${formatCents(potential)}`, disabled: false, action: () => cashout.mutate() };
      if (myPlayer?.status === "cashed") return { label: `Cashed out ${formatMultiplier(myPlayer.cashoutMultiplier ?? 1)}`, disabled: true, action: () => undefined };
      if (myPlayer?.status === "lost") return { label: "Round lost", disabled: true, action: () => undefined };
      return { label: "Betting closed", disabled: true, action: () => undefined };
    }
    return { label: `Next round in ${countdown ?? 0}s`, disabled: true, action: () => undefined };
  })();

  return (
    <GamePageLayout
      game={game}
      wide
      showHistory={false}
      showSeedPanel={false}
      controls={
        <section className="surface p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={cn("size-1.5 rounded-full", connected ? "bg-green" : "bg-red")} />
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted">{phaseLabel(phase)}</p>
            </div>
            <span className="text-[10px] font-semibold text-muted/60">Round #{snapshot?.roundNumber ?? "—"}</span>
          </div>
          <div className="mt-4">
            <BetAmountControl game={game} balanceCents={session.wallet.balanceCents} amount={amount} setAmount={setAmount} disabled={phase !== "betting" || !!myPlayer || place.isPending} />
          </div>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-line/50 bg-[#0f212e] px-3 py-2.5">
            <div>
              <p className="text-[10px] font-semibold text-muted">Auto cashout</p>
              <p className="text-[9px] text-muted/50">Cash out automatically</p>
            </div>
            <button
              type="button"
              onClick={() => setAutoEnabled((current) => !current)}
              disabled={phase !== "betting" || !!myPlayer}
              className={cn("relative h-6 w-10 rounded-full transition disabled:opacity-40", autoEnabled ? "bg-green" : "bg-[#2f4553]")}
              aria-label="Toggle auto cashout"
            >
              <span className={cn("absolute top-1 size-4 rounded-full bg-white transition", autoEnabled ? "left-5" : "left-1")} />
            </button>
          </div>
          {autoEnabled ? (
            <div className="mt-2 flex h-11 items-center rounded-lg bg-[#0f212e] px-3">
              <input
                value={autoCashout}
                onChange={(event) => setAutoCashout(event.target.value.replace(/[^0-9.]/g, ""))}
                disabled={phase !== "betting" || !!myPlayer}
                inputMode="decimal"
                className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none disabled:opacity-50"
              />
              <span className="text-sm font-bold text-muted">×</span>
            </div>
          ) : null}
          {myPlayer ? (
            <div className="mt-4 rounded-lg bg-[#0f212e] p-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted">Your bet</span>
                <span className="text-xs font-bold text-white">{formatCents(myPlayer.amountCents)}</span>
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="text-[10px] text-muted">Status</span>
                <span className={cn("text-[10px] font-bold", myPlayer.status === "cashed" ? "text-green" : myPlayer.status === "lost" ? "text-red" : "text-amber")}>
                  {myPlayer.status === "cashed" ? `Cashed ${formatMultiplier(myPlayer.cashoutMultiplier ?? 1)}` : myPlayer.status === "lost" ? "Lost" : activeBet ? `Riding ${formatMultiplier(multiplier)}` : "Waiting"}
                </span>
              </div>
              {activeBet ? <p className="mt-1.5 text-[10px] text-green">Cashout value {formatCents(potential)}</p> : null}
            </div>
          ) : null}
          <button type="button" className="btn btn-primary mt-4 w-full" disabled={button.disabled} onClick={button.action}>
            {button.label}
          </button>
          {!autoValid ? <p className="mt-2 text-[10px] text-red">Auto cashout must be between 1.01× and 1,000,000×.</p> : null}
          {phase === "betting" && !myPlayer ? (
            <p className="mt-3 text-center text-[10px] text-muted/60">Betting closes in {countdown ?? 0}s</p>
          ) : null}

          <div className="mt-5 border-t border-line/60 pt-4">
            <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-wider text-muted/55">
              <ShieldCheck className="size-3 text-green" /> Round fairness
            </div>
            <p className="mt-2 truncate font-mono text-[9px] text-muted/60">{snapshot?.serverSeedHash ?? "Connecting…"}</p>
            {snapshot?.phase === "crashed" && snapshot.serverSeed ? (
              <p className="mt-1 break-all font-mono text-[9px] text-green/70">Revealed: {snapshot.serverSeed}</p>
            ) : (
              <p className="mt-1 text-[9px] leading-4 text-muted/50">The server seed is revealed after the round crashes.</p>
            )}
          </div>
        </section>
      }
      stage={
        <section className="surface relative overflow-hidden p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
              <Rocket className="size-3.5 text-orange" /> Crash
            </div>
            <div className="flex items-center gap-3 text-[9px] text-muted/60">
              <span className="flex items-center gap-1"><Users className="size-3" /> {snapshot?.players.length ?? 0} players</span>
              <span className="flex items-center gap-1"><Timer className="size-3" /> {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
          </div>
          <div className="mt-3">
            <CrashGraph snapshot={snapshot} />
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,1fr)_240px]">
            <div className="surface-soft overflow-hidden">
              <div className="flex items-center justify-between border-b border-line/50 px-3.5 py-2.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Players this round</p>
                <span className="text-[9px] text-muted/50">Live</span>
              </div>
              <div className="max-h-[260px] overflow-y-auto">
                {(snapshot?.players ?? []).length === 0 ? (
                  <div className="flex h-24 items-center justify-center text-[10px] text-muted">Waiting for players…</div>
                ) : (
                  <div className="divide-y divide-line/30">
                    {(snapshot?.players ?? []).slice(0, 18).map((player) => (
                      <motion.div key={player.userId} initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className={cn("flex items-center gap-2.5 px-3 py-2", player.userId === session.user.id && "bg-green/[0.04]")}>
                        <span className={cn("grid size-6 shrink-0 place-items-center rounded-full bg-gradient-to-br text-[8px] font-black", avatarTone(player.userId))}>{initials(player.name)}</span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-semibold text-white">{player.name}{player.userId === session.user.id ? <span className="ml-1 text-[8px] text-green">YOU</span> : null}</p>
                          <p className="text-[8px] text-muted/50">{formatCents(player.amountCents)} {player.autoCashout ? `· auto ${formatMultiplier(player.autoCashout)}` : ""}</p>
                        </div>
                        <span className={cn("shrink-0 text-[9px] font-bold", player.status === "cashed" ? "text-green" : player.status === "lost" ? "text-red/70" : "text-amber")}>
                          {player.status === "cashed" ? `${formatMultiplier(player.cashoutMultiplier ?? 1)} · ${formatCents(player.payoutCents)}` : player.status === "lost" ? "Lost" : "Riding"}
                        </span>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <div className="surface-soft p-3.5">
              <div className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-wider text-muted/55"><Clock3 className="size-3" /> Previous crashes</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {(snapshot?.history ?? []).slice().reverse().map((round) => (
                  <span
                    key={round.roundNumber}
                    className={cn(
                      "rounded-md px-2 py-1 font-mono text-[9px] font-bold",
                      round.crashPoint >= 10 ? "bg-amber/10 text-amber" : round.crashPoint >= 2 ? "bg-green/10 text-green" : "bg-red/10 text-red/70",
                    )}
                    title={`Round #${round.roundNumber}`}
                  >
                    {formatMultiplier(round.crashPoint)}
                  </span>
                ))}
                {(snapshot?.history ?? []).length === 0 ? <span className="text-[10px] text-muted/50">No rounds yet</span> : null}
              </div>
              <div className="mt-4 rounded-lg border border-line/40 bg-[#0f212e]/60 p-2.5">
                <p className="text-[9px] font-bold uppercase tracking-wider text-muted/50">House edge</p>
                <p className="mt-1 text-[10px] text-muted">1% · 99% RTP</p>
              </div>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-center gap-2 text-[10px] text-muted">
            <Sparkles className="size-3 text-orange" />
            {phase === "betting" ? "Place your bet before the countdown ends." : phase === "running" ? "Cash out before the curve crashes." : "The round is over. The next one starts shortly."}
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Rocket className="size-4 text-orange" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Crash:</strong> cash out early for a small win, or hold on for a bigger multiplier and risk it all.
          </p>
        </div>
      }
    />
  );
}
