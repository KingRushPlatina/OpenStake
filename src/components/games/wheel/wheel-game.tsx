"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { motion } from "motion/react";
import { CircleDashed, Disc3, Sparkles } from "lucide-react";
import type { GameMetadata, PublicBet } from "@/modules/games/types";
import { apiFetch } from "@/lib/api-client";
import { cn, newRequestKey } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";
import { useSession } from "@/components/session-provider";
import { GamePageLayout } from "@/components/games/game-page-layout";
import { BetAmountControl, SegmentedControl, useBetAmount } from "@/components/games/bet-controls";
import { useGameResult } from "@/components/games/use-game-result";
import { getWheelMultipliers, type WheelRisk } from "@/modules/games/instant/wheel";

type WheelResult = { segments: number; risk: WheelRisk; index: number; multipliers: number[]; multiplier: number };

function polar(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function segmentColor(multiplier: number) {
  if (multiplier >= 10) return "#ff5d5d";
  if (multiplier >= 3) return "#ffb800";
  if (multiplier >= 1.5) return "#c68b1a";
  if (multiplier >= 1) return "#264e63";
  if (multiplier > 0) return "#1c3949";
  return "#142a36";
}

function WheelGraphic({ multipliers, rotation }: { multipliers: number[]; rotation: number }) {
  const count = multipliers.length;
  const angle = 360 / count;
  const radius = 92;
  const paths = Array.from({ length: count }, (_, index) => {
    const start = index * angle;
    const end = start + angle;
    const startPoint = polar(100, 100, radius, start);
    const endPoint = polar(100, 100, radius, end);
    const label = polar(100, 100, 66, start + angle / 2);
    return { index, start, end, startPoint, endPoint, label, multiplier: multipliers[index] };
  });

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[390px]">
      <div className="absolute inset-[9%] rounded-full bg-[#0b1a24] shadow-[0_0_80px_rgba(0,0,0,0.45)]" />
      <div
        className="absolute inset-0 rounded-full border-[6px] border-[#2a4757] shadow-[inset_0_0_0_2px_#0f212e,0_20px_70px_rgba(0,0,0,0.4)]"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: "transform 4s cubic-bezier(0.12, 0.7, 0.12, 1)",
        }}
      >
        <svg viewBox="0 0 200 200" className="size-full">
          <circle cx="100" cy="100" r="98" fill="#142a36" />
          {paths.map((segment) => (
            <g key={segment.index}>
              <path
                d={`M 100 100 L ${segment.startPoint.x} ${segment.startPoint.y} A ${radius} ${radius} 0 0 1 ${segment.endPoint.x} ${segment.endPoint.y} Z`}
                fill={segmentColor(segment.multiplier)}
                stroke="#0f212e"
                strokeWidth="0.5"
              />
              {count <= 20 ? (
                <text
                  x={segment.label.x}
                  y={segment.label.y}
                  fill={segment.multiplier >= 3 ? "#1a1200" : "#dbe7ef"}
                  fontSize={count <= 10 ? "7" : "5.5"}
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {segment.multiplier < 1 ? "0" : `${segment.multiplier}×`}
                </text>
              ) : null}
            </g>
          ))}
          <circle cx="100" cy="100" r="16" fill="#0f212e" stroke="#2f4553" strokeWidth="2" />
          <text x="100" y="101" textAnchor="middle" dominantBaseline="middle" fill="#00e701" fontSize="13" fontWeight="900">
            O
          </text>
        </svg>
      </div>
      <div className="absolute left-1/2 top-[-7px] z-10 -translate-x-1/2">
        <div className="h-0 w-0 border-x-[10px] border-t-[16px] border-x-transparent border-t-green drop-shadow-[0_2px_6px_rgba(0,231,1,0.6)]" />
      </div>
      <div className="absolute inset-[9%] rounded-full border border-white/[0.06]" />
    </div>
  );
}

export function WheelGame({ game }: { game: GameMetadata }) {
  const { session } = useSession();
  const { amount, setAmount, amountCents, valid } = useBetAmount(game);
  const [segments, setSegments] = useState<10 | 20 | 30 | 40 | 50>(20);
  const [risk, setRisk] = useState<WheelRisk>("medium");
  const [lastBet, setLastBet] = useState<PublicBet | null>(null);
  const [rotation, setRotation] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const timeout = useRef<number | undefined>(undefined);
  const result = useGameResult(game.id);
  const multipliers = useMemo(() => getWheelMultipliers(segments, risk), [segments, risk]);
  const maxMultiplier = Math.max(...multipliers);
  const angle = 360 / segments;

  const mutation = useMutation({
    mutationFn: () =>
      apiFetch<PublicBet>("/api/games/wheel/play", {
        method: "POST",
        body: JSON.stringify({ amountCents, input: { segments, risk }, idempotencyKey: newRequestKey() }),
      }),
    onSuccess: (bet) => {
      setLastBet(bet);
      result.onResult(bet);
      const payload = bet.result as WheelResult;
      const required = 360 - ((payload.index * angle + angle / 2) % 360);
      setRotation((current) => current + 1800 + ((required - (current % 360) + 360) % 360));
      setSpinning(true);
      window.clearTimeout(timeout.current);
      timeout.current = window.setTimeout(() => setSpinning(false), 4100);
    },
    onError: result.onError,
  });

  const wheelResult = lastBet?.result as WheelResult | undefined;

  return (
    <GamePageLayout
      game={game}
      controls={
        <section className="surface p-4">
          <BetAmountControl game={game} balanceCents={session.wallet.balanceCents} amount={amount} setAmount={setAmount} disabled={mutation.isPending || spinning} />
          <div className="my-4 h-px bg-line/60" />
          <p className="mb-2 text-[11px] font-semibold text-muted">Risk</p>
          <SegmentedControl
            value={risk}
            onChange={setRisk}
            disabled={spinning}
            options={[
              { value: "low", label: "Low" },
              { value: "medium", label: "Medium" },
              { value: "high", label: "High" },
            ]}
          />
          <p className="mb-2 mt-4 text-[11px] font-semibold text-muted">Segments</p>
          <SegmentedControl
            value={String(segments) as "10" | "20" | "30" | "40" | "50"}
            onChange={(value) => setSegments(Number(value) as 10 | 20 | 30 | 40 | 50)}
            disabled={spinning}
            options={[
              { value: "10", label: "10" },
              { value: "20", label: "20" },
              { value: "30", label: "30" },
              { value: "40", label: "40" },
              { value: "50", label: "50" },
            ]}
          />
          <div className="mt-4 grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Max multiplier</p>
              <p className="mt-1 font-display text-lg font-bold text-amber">{formatMultiplier(maxMultiplier)}</p>
            </div>
            <div className="rounded-lg bg-[#0f212e] p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-muted/60">Max payout</p>
              <p className="mt-1 font-display text-lg font-bold text-white">{formatCents(Math.floor(amountCents * maxMultiplier), { compact: true })}</p>
            </div>
          </div>
          <button type="button" className="btn btn-primary mt-4 w-full" disabled={!valid || mutation.isPending || spinning} onClick={() => mutation.mutate()}>
            {spinning ? "Spinning…" : "Spin wheel"}
          </button>
        </section>
      }
      stage={
        <section className="surface relative min-h-[480px] overflow-hidden p-4 sm:p-6">
          <div className="absolute left-1/2 top-1/2 size-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber/[0.06] blur-3xl" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">
                <Disc3 className="size-3.5 text-amber" /> Wheel
              </div>
              {wheelResult && !spinning ? (
                <div className={cn("rounded-full border px-2.5 py-1 text-[10px] font-bold", wheelResult.multiplier > 0 ? "border-amber/30 bg-amber/10 text-amber" : "border-line bg-[#0f212e] text-muted")}>
                  {formatMultiplier(wheelResult.multiplier)} · {formatCents(lastBet?.payoutCents ?? 0)}
                </div>
              ) : (
                <div className="rounded-full border border-line/60 bg-[#0f212e]/70 px-2.5 py-1 text-[9px] font-semibold text-muted">{risk} risk</div>
              )}
            </div>
            <div className="mx-auto mt-5 max-w-[430px]">
              <WheelGraphic multipliers={wheelResult?.multipliers ?? multipliers} rotation={rotation} />
            </div>
            <div className="mt-3 flex min-h-[44px] items-center justify-center gap-2 text-center text-[11px]">
              {lastBet && wheelResult && !spinning ? (
                <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2">
                  <Sparkles className={lastBet.payoutCents > 0 ? "size-3.5 text-amber" : "size-3.5 text-muted"} />
                  <span className="text-muted">
                    Landed on <strong className="text-white">{formatMultiplier(wheelResult.multiplier)}</strong>
                    {lastBet.payoutCents > 0 ? ` · +${formatCents(lastBet.payoutCents - lastBet.amountCents)}` : " · no win"}
                  </span>
                </motion.div>
              ) : spinning ? (
                <span className="flex items-center gap-2 text-muted">
                  <CircleDashed className="size-3.5 animate-spin text-amber" /> The wheel is deciding…
                </span>
              ) : (
                <span className="text-muted">Pick a risk level and spin.</span>
              )}
            </div>
          </div>
        </section>
      }
      mobileSide={
        <div className="surface flex items-center gap-3 p-3">
          <Sparkles className="size-4 text-amber" />
          <p className="text-[10px] text-muted">
            <strong className="text-white">Wheel:</strong> every segment is equally likely. The risk changes the payout spread.
          </p>
        </div>
      }
    />
  );
}
