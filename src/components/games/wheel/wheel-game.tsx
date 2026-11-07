"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CircleDashed } from "lucide-react";
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
import { getWheelMultipliers, type WheelRisk } from "@/modules/games/instant/wheel";

type WheelResult = { segments: number; risk: WheelRisk; index: number; multipliers: number[]; multiplier: number };

function polar(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function segmentColor(multiplier: number) {
  if (multiplier >= 10) return "#d8b878";
  if (multiplier >= 3) return "#9c7a44";
  if (multiplier >= 1.5) return "#3d6b57";
  if (multiplier >= 1) return "#1d3d31";
  if (multiplier > 0) return "#152a23";
  return "#0c1713";
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
    return { index, startPoint, endPoint, label, multiplier: multipliers[index] };
  });

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[380px]">
      <div className="absolute inset-[9%] rounded-full bg-[#07130e] shadow-[0_0_80px_rgba(0,0,0,0.45)]" />
      <div
        className="absolute inset-0 rounded-full border-[6px] border-[#1c3a2e] shadow-[inset_0_0_0_2px_#080b09,0_20px_70px_rgba(0,0,0,0.4)]"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: "transform 4s cubic-bezier(0.12, 0.7, 0.12, 1)",
        }}
      >
        <svg viewBox="0 0 200 200" className="size-full">
          <circle cx="100" cy="100" r="98" fill="#10251c" />
          {paths.map((segment) => (
            <g key={segment.index}>
              <path
                d={`M 100 100 L ${segment.startPoint.x} ${segment.startPoint.y} A ${radius} ${radius} 0 0 1 ${segment.endPoint.x} ${segment.endPoint.y} Z`}
                fill={segmentColor(segment.multiplier)}
                stroke="#080b09"
                strokeWidth="0.5"
              />
              {count <= 20 ? (
                <text
                  x={segment.label.x}
                  y={segment.label.y}
                  fill={segment.multiplier >= 3 ? "#14100a" : "#e8e4d8"}
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
          <circle cx="100" cy="100" r="16" fill="#0a1510" stroke="#d8b878" strokeOpacity="0.35" strokeWidth="1.5" />
          <text x="100" y="101" textAnchor="middle" dominantBaseline="middle" fill="#d8b878" fontSize="13" fontWeight="700">
            O
          </text>
        </svg>
      </div>
      <div className="absolute left-1/2 top-[-7px] z-10 -translate-x-1/2">
        <div className="h-0 w-0 border-x-[10px] border-t-[16px] border-x-transparent border-t-gold drop-shadow-[0_2px_6px_rgba(216,184,120,0.5)]" />
      </div>
      <div className="absolute inset-[9%] rounded-full border border-white/[0.04]" />
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
  const result = useGameResult(game.name);
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
    <GameShell
      game={game}
      controls={
        <ControlPanel title="Spin settings">
          <BetAmountControl
            game={game}
            balanceCents={session.wallet.balanceCents}
            amount={amount}
            setAmount={setAmount}
            disabled={mutation.isPending || spinning}
          />
          <div>
            <p className="mb-2 text-[10px] font-medium text-muted">Risk</p>
            <SegmentedControl
              value={risk}
              onChange={setRisk}
              disabled={spinning}
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Med" },
                { value: "high", label: "High" },
              ]}
            />
          </div>
          <div>
            <p className="mb-2 text-[10px] font-medium text-muted">Segments</p>
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
          </div>
          <div className="grid grid-cols-2 gap-2">
            <StatTile label="Top multiplier" value={formatMultiplier(maxMultiplier)} tone="text-gold" />
            <StatTile label="Top payout" value={formatCents(Math.floor(amountCents * maxMultiplier), { compact: true })} />
          </div>
          <PlayButton disabled={!valid || mutation.isPending || spinning} onClick={() => mutation.mutate()}>
            {spinning ? "Spinning…" : "Spin wheel"}
          </PlayButton>
        </ControlPanel>
      }
      stage={
        <Stage
          label="Wheel table"
          status={
            wheelResult && !spinning ? (
              <span className={cn("rounded-full border px-2.5 py-1 text-[9px] font-medium", wheelResult.multiplier > 0 ? "border-gold/30 bg-gold/10 text-gold" : "border-line/60 text-muted")}>
                {formatMultiplier(wheelResult.multiplier)} · {formatCents(lastBet?.payoutCents ?? 0)}
              </span>
            ) : (
              <span className="rounded-full border border-line/60 px-2.5 py-1 text-[9px] font-medium text-muted">{risk} risk</span>
            )
          }
          footer={
            <div className="flex items-center justify-center gap-2 text-[10px] text-muted/60">
              {lastBet && wheelResult && !spinning ? (
                <>
                  Landed on <span className="font-medium text-ink">{formatMultiplier(wheelResult.multiplier)}</span>
                  {lastBet.payoutCents > 0 ? ` · +${formatCents(lastBet.payoutCents - lastBet.amountCents)}` : " · no win"}
                </>
              ) : spinning ? (
                <>
                  <CircleDashed className="size-3.5 animate-spin text-gold" /> The wheel is deciding…
                </>
              ) : (
                "Pick a risk level and spin."
              )}
            </div>
          }
        >
          <div className="mx-auto mt-2 max-w-[430px]">
            <WheelGraphic multipliers={wheelResult?.multipliers ?? multipliers} rotation={rotation} />
          </div>
        </Stage>
      }
    />
  );
}
