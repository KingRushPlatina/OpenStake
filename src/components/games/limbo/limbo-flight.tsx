"use client";

import { formatMultiplier } from "@/lib/money";
import { cn } from "@/lib/client-utils";
import { limboFlightAt, limboFlightPoint } from "@/lib/limbo";
import { useLimboClock } from "./use-limbo-clock";

export type LimboPhase = "idle" | "flying" | "cashed" | "crashed";

const X_START = 6;
const X_END = 94;
const Y_START = 88;
const Y_END = 14;

function toSceneX(progress: number) {
  return (X_START + progress * (X_END - X_START)) * 8;
}

function toSceneY(progress: number) {
  return (Y_START - progress * (Y_START - Y_END)) * 3.6;
}

function trailPath(progress: number) {
  const steps = Math.max(3, Math.round(progress * 84));
  let path = "";
  for (let index = 0; index <= steps; index += 1) {
    const point = limboFlightAt(progress * (index / steps));
    const x = toSceneX(point.x).toFixed(1);
    const y = toSceneY(point.y).toFixed(1);
    path += index === 0 ? `M${x} ${y}` : ` L${x} ${y}`;
  }
  return path;
}

function planeTilt(progress: number) {
  const from = limboFlightAt(progress);
  const to = limboFlightAt(Math.min(0.999, progress + 0.02));
  const dx = (to.x - from.x) * 5;
  const dy = -(to.y - from.y) * 4;
  if (dx <= 0) return -42;
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

const phaseLabel: Record<LimboPhase, string> = {
  idle: "Ready for takeoff",
  flying: "In flight",
  cashed: "Cashed out",
  crashed: "Crashed",
};

export function LimboFlight({
  active,
  startedAtMs,
  offsetRef,
  settledMultiplier,
  phase,
  roundKey,
}: {
  active: boolean;
  startedAtMs?: number;
  offsetRef: { current: number };
  settledMultiplier: number;
  phase: LimboPhase;
  roundKey: string;
}) {
  const live = useLimboClock(active ? startedAtMs : undefined, offsetRef);
  const value = Math.max(1, active ? live : settledMultiplier);
  const point = limboFlightPoint(value);
  const planeLeft = X_START + point.x * (X_END - X_START);
  const planeTop = Y_START - point.y * (Y_START - Y_END);
  const tilt = planeTilt(point.u);
  const guide = trailPath(0.985);
  const trail = phase === "idle" ? "" : trailPath(point.u);

  const tone =
    phase === "crashed"
      ? "text-[#f08a7d]"
      : phase === "cashed"
        ? "text-green"
        : phase === "flying"
          ? "text-ink"
          : "text-ink/25";

  return (
    <div
      className="limbo-flight relative min-h-[330px] overflow-hidden rounded-2xl border border-line/60 bg-[#090c11] sm:min-h-[380px]"
      data-phase={phase}
    >
      <svg
        viewBox="0 0 800 360"
        preserveAspectRatio="none"
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <pattern id="limbo-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M40 0H0V40" fill="none" stroke="rgba(195,169,236,0.09)" strokeWidth="1" />
          </pattern>
          <linearGradient id="limbo-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0b0a16" />
            <stop offset="58%" stopColor="#0a0d14" />
            <stop offset="100%" stopColor="#0c1016" />
          </linearGradient>
          <radialGradient id="limbo-haze" cx="72%" cy="24%" r="58%">
            <stop offset="0%" stopColor="rgba(150,116,220,0.26)" />
            <stop offset="100%" stopColor="rgba(150,116,220,0)" />
          </radialGradient>
          <linearGradient id="limbo-trail" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="rgba(195,169,236,0)" />
            <stop offset="34%" stopColor="rgba(195,169,236,0.35)" />
            <stop offset="100%" stopColor="#e8dcff" />
          </linearGradient>
          <linearGradient id="limbo-plane-fill" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#fdfbff" />
            <stop offset="52%" stopColor="#d9c9f5" />
            <stop offset="100%" stopColor="#a98bd9" />
          </linearGradient>
          <filter id="limbo-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <rect width="800" height="360" fill="url(#limbo-sky)" />
        <rect width="800" height="360" fill="url(#limbo-haze)" />
        <rect width="800" height="360" fill="url(#limbo-grid)" opacity="0.7" />

        {[
          [96, 74, 1.6],
          [188, 132, 1.1],
          [286, 58, 1.9],
          [520, 92, 1.3],
          [646, 48, 1.7],
          [716, 142, 1],
          [408, 38, 1.2],
          [128, 210, 0.9],
        ].map(([x, y, r], index) => (
          <circle key={index} cx={x} cy={y} r={r} fill="rgba(232,220,255,0.45)" />
        ))}

        <path d={guide} fill="none" stroke="rgba(195,169,236,0.16)" strokeWidth="2" strokeDasharray="5 9" strokeLinecap="round" />
        <path
          d={trail}
          className="limbo-trail-glow"
          fill="none"
          stroke="url(#limbo-trail)"
          strokeWidth="10"
          strokeLinecap="round"
          opacity="0.38"
          filter="url(#limbo-glow)"
        />
        <path
          d={trail}
          className="limbo-trail-core"
          fill="none"
          stroke="url(#limbo-trail)"
          strokeWidth="3"
          strokeLinecap="round"
        />
      </svg>

      <div className="pointer-events-none absolute inset-0 z-10 flex flex-col items-center justify-center px-6 text-center">
        <p
          className={cn(
            "text-[9px] font-semibold uppercase tracking-[0.28em] transition-colors duration-300",
            phase === "crashed" ? "text-[#f08a7d]/80" : phase === "cashed" ? "text-green/80" : "text-muted/50",
          )}
        >
          {phaseLabel[phase]}
        </p>
        <p
          className={cn(
            "limbo-number mt-2 font-display text-[68px] leading-none tracking-[-0.06em] tabular-nums sm:text-[84px]",
            tone,
          )}
        >
          {formatMultiplier(phase === "idle" ? 1 : value)}
        </p>
        <p
          className={cn(
            "mt-3 text-[10px] font-medium tracking-wide",
            phase === "crashed"
              ? "text-[#f08a7d]/70"
              : phase === "cashed"
                ? "text-green/70"
                : "text-muted/45",
          )}
        >
          {phase === "crashed"
            ? "The plane went down. Better luck next flight."
            : phase === "cashed"
              ? "You jumped out before the fall."
              : phase === "flying"
                ? "Cash out any time. The higher you ride, the harder it falls."
                : "Place a bet and the plane takes off."}
        </p>
      </div>

      <div
        key={`${roundKey}-${phase}`}
        className={cn(
          "limbo-plane absolute z-20",
          phase === "idle" && "limbo-plane-idle",
          phase === "crashed" && "limbo-plane-crash",
          phase === "cashed" && "limbo-plane-away",
        )}
        style={{
          left: `${planeLeft}%`,
          top: `${planeTop}%`,
          // @ts-expect-error CSS custom property for the base rotation
          "--plane-tilt": `${tilt}deg`,
        }}
      >
        <span className="limbo-plane-glow" />
        <svg viewBox="0 0 48 32" className="limbo-plane-body" aria-hidden="true">
          <path
            d="M1 15.4 15.5 11.6 28.2 2.6 33 2.6 28.4 11.4 41.4 11.4 47 15.4 47 17.2 41.4 21 28.4 21 33 29.9 28.2 29.9 15.5 21.2 1 17.4Z"
            fill="url(#limbo-plane-fill)"
            stroke="rgba(255,255,255,0.85)"
            strokeWidth="0.8"
            strokeLinejoin="round"
          />
          <path d="M37.4 14.2h3.9l1.4 1.9-1.4 2.1h-3.9z" fill="#f6efe2" opacity="0.9" />
        </svg>
      </div>

      {phase === "crashed" ? (
        <div
          key={`burst-${roundKey}`}
          className="limbo-crash-burst z-20"
          style={{ left: `${planeLeft}%`, top: `${planeTop}%` }}
          aria-hidden="true"
        >
          <span className="limbo-crash-core" />
          <span className="limbo-crash-ring" />
          <span className="limbo-crash-ring limbo-crash-ring-late" />
        </div>
      ) : null}

      {phase === "cashed" ? (
        <div
          key={`cash-${roundKey}`}
          className="limbo-cash-burst z-20"
          style={{ left: `${planeLeft}%`, top: `${planeTop}%` }}
          aria-hidden="true"
        >
          <span className="limbo-cash-ring" />
        </div>
      ) : null}
    </div>
  );
}
