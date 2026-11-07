"use client";

import { motion } from "motion/react";
import { Rocket, Timer } from "lucide-react";
import { cn } from "@/lib/client-utils";
import { useClock } from "@/components/casino/use-clock";
import { formatMultiplier } from "@/lib/money";
import type { CrashSnapshot } from "@/types/crash";

const WIDTH = 640;
const HEIGHT = 300;
const GROWTH = 0.12;

function curvePath(elapsedMs: number, multiplier: number) {
  const elapsed = Math.max(0, elapsedMs) / 1000;
  const timeWindow = Math.max(8, elapsed * 1.18);
  const yMax = Math.max(2, multiplier * 1.18);
  const points = Array.from({ length: 72 }, (_, index) => {
    const t = (elapsed * index) / 71;
    const value = Math.exp(GROWTH * t);
    const x = (t / timeWindow) * WIDTH;
    const y = HEIGHT - 24 - ((value - 1) / (yMax - 1)) * (HEIGHT - 64);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  return { path: `M ${points.join(" L ")}`, timeWindow };
}

export function CrashGraph({ snapshot }: { snapshot: CrashSnapshot | null }) {
  const phase = snapshot?.phase ?? "betting";
  const multiplier = snapshot?.multiplier ?? 1;
  const now = useClock();
  const elapsed = snapshot?.elapsedMs ?? 0;
  const crashPoint = snapshot?.crashPoint ?? null;
  const { path, timeWindow } = curvePath(elapsed, crashPoint ?? multiplier);
  const yMax = Math.max(2, (crashPoint ?? multiplier) * 1.18);
  const endX = Math.min(WIDTH, (elapsed / 1000 / timeWindow) * WIDTH);
  const endY = HEIGHT - 24 - ((multiplier - 1) / (yMax - 1)) * (HEIGHT - 64);
  const countdown =
    snapshot?.phaseEndsAt !== null && snapshot?.phaseEndsAt !== undefined
      ? now > 0
        ? Math.max(0, Math.ceil((new Date(snapshot.phaseEndsAt).getTime() - now) / 1000))
        : null
      : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-line/50 bg-[#0b1a24]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,231,1,0.07),transparent_55%)]" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.15em] text-muted/60">
          <span className={cn("size-1.5 rounded-full", phase === "running" ? "animate-pulse bg-green" : phase === "crashed" ? "bg-red" : "bg-amber")} />
          Round #{snapshot?.roundNumber ?? "—"}
        </div>
        <div className="flex items-center gap-2 text-[9px] font-semibold text-muted/60">
          {phase === "betting" ? <Timer className="size-3 text-amber" /> : <Rocket className="size-3 text-green" />}
          {phase === "betting" ? `Betting closes in ${countdown ?? 0}s` : phase === "crashed" ? `Next round in ${countdown ?? 0}s` : "Live round"}
        </div>
      </div>

      <div className="relative h-[300px] w-full sm:h-[340px]">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} preserveAspectRatio="none" className="absolute inset-0 size-full">
          <defs>
            <linearGradient id="crash-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#00e701" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#00e701" stopOpacity="0" />
            </linearGradient>
            <filter id="crash-glow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line key={fraction} x1="0" y1={HEIGHT * fraction} x2={WIDTH} y2={HEIGHT * fraction} stroke="#ffffff" strokeOpacity="0.035" strokeDasharray="4 8" />
          ))}
          {[0.25, 0.5, 0.75].map((fraction) => (
            <line key={`v-${fraction}`} x1={WIDTH * fraction} y1="0" x2={WIDTH * fraction} y2={HEIGHT} stroke="#ffffff" strokeOpacity="0.035" strokeDasharray="4 8" />
          ))}
          {phase !== "betting" ? (
            <>
              <path d={`${path} L ${Math.max(0, endX)} ${HEIGHT} L 0 ${HEIGHT} Z`} fill="url(#crash-fill)" />
              <path d={path} fill="none" stroke={phase === "crashed" ? "#ff4d4d" : "#00e701"} strokeWidth="3" strokeLinecap="round" filter="url(#crash-glow)" />
              <circle cx={Math.max(0, endX)} cy={Math.max(0, endY)} r="5" fill={phase === "crashed" ? "#ff4d4d" : "#00e701"} stroke="#0b1a24" strokeWidth="2" />
            </>
          ) : null}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {phase === "betting" ? (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber">Place your bet</p>
              <p className="mt-2 font-display text-5xl font-bold tracking-[-0.05em] text-white sm:text-6xl">{countdown ?? 0}s</p>
              <p className="mt-2 text-xs text-muted">The next round is about to begin.</p>
            </motion.div>
          ) : (
            <motion.div initial={false} animate={{ scale: phase === "crashed" ? 0.94 : 1 }} className="text-center">
              <p className={cn("font-display text-[62px] font-bold leading-none tracking-[-0.07em] sm:text-[86px]", phase === "crashed" ? "text-red" : "text-white")}>
                {formatMultiplier(multiplier)}
              </p>
              <p className={cn("mt-2 text-[11px] font-bold uppercase tracking-[0.18em]", phase === "crashed" ? "text-red" : "text-green")}>
                {phase === "crashed" ? `Crashed at ${formatMultiplier(crashPoint ?? 1)}` : "The curve is rising"}
              </p>
            </motion.div>
          )}
        </div>

        {phase === "crashed" ? (
          <div className="absolute inset-x-0 bottom-0 flex justify-center pb-3">
            <span className="rounded-full border border-red/20 bg-red/10 px-3 py-1 text-[10px] font-semibold text-red/90">Round over</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
