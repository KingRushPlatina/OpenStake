"use client";

import { motion } from "motion/react";
import { ChevronsUp, Flag, Footprints, Trophy } from "lucide-react";
import { cn } from "@/lib/client-utils";
import { formatCents, formatMultiplier } from "@/lib/money";

const LANE_HEIGHT = 40;
const CAR_COLORS = ["#d8b878", "#e06c6c", "#7fb2d9", "#4fd39b", "#c3a9ec", "#e8935c"];

type Traffic = {
  lane: number;
  color: string;
  direction: 1 | -1;
  duration: number;
  delay: number;
  repeatDelay: number;
};

function trafficForLane(lane: number): Traffic {
  return {
    lane,
    color: CAR_COLORS[lane % CAR_COLORS.length]!,
    direction: lane % 2 === 0 ? 1 : -1,
    duration: 5.4 + (lane % 4) * 0.9,
    delay: (lane % 5) * 0.5,
    repeatDelay: 0.7 + (lane % 3) * 0.55,
  };
}

const TRAFFIC = Array.from({ length: 12 }, (_, lane) => trafficForLane(lane)).filter(
  (traffic) => traffic.lane % 2 === 0 || traffic.lane % 3 === 0,
);

function CarSprite({ color, direction, className }: { color: string; direction: 1 | -1; className?: string }) {
  return (
    <svg
      viewBox="0 0 108 40"
      aria-hidden
      className={className}
      style={{ transform: direction === -1 ? "scaleX(-1)" : undefined }}
    >
      <ellipse cx="46" cy="33" rx="38" ry="5" fill="#000" opacity="0.42" />
      <polygon points="86,12 108,4 108,36 86,28" fill="#fff3c4" opacity="0.1" />
      <rect x="16" y="1.5" width="13" height="5.5" rx="2.75" fill="#0a0d0b" />
      <rect x="58" y="1.5" width="13" height="5.5" rx="2.75" fill="#0a0d0b" />
      <rect x="16" y="33" width="13" height="5.5" rx="2.75" fill="#0a0d0b" />
      <rect x="58" y="33" width="13" height="5.5" rx="2.75" fill="#0a0d0b" />
      <rect x="4" y="7" width="80" height="26" rx="10" fill={color} />
      <rect x="4" y="7" width="80" height="10" rx="8" fill="#ffffff" opacity="0.16" />
      <rect x="28" y="10" width="30" height="20" rx="6" fill="#0d1b22" opacity="0.9" />
      <rect x="31" y="12" width="24" height="5.5" rx="2.75" fill="#bde3f2" opacity="0.55" />
      <rect x="31" y="22.5" width="24" height="5.5" rx="2.75" fill="#6fa9bd" opacity="0.4" />
      <rect x="80" y="11" width="7" height="5" rx="2.5" fill="#fff3c4" />
      <rect x="80" y="24" width="7" height="5" rx="2.5" fill="#fff3c4" />
      <rect x="4" y="12" width="4.5" height="4.5" rx="2.25" fill="#ff7b6b" opacity="0.9" />
      <rect x="4" y="23.5" width="4.5" height="4.5" rx="2.25" fill="#ff7b6b" opacity="0.9" />
      <rect x="86" y="8" width="2.5" height="24" rx="1.25" fill={color} opacity="0.45" />
    </svg>
  );
}

function ChickenSprite({ mood }: { mood: "idle" | "hop" | "hit" | "win" | "cash" }) {
  const flapping = mood === "hop" || mood === "win";
  return (
    <svg viewBox="0 0 64 72" aria-hidden className="size-full overflow-visible drop-shadow-[0_6px_10px_rgba(0,0,0,0.55)]">
      <defs>
        <radialGradient id="chicken-back" cx="38%" cy="24%" r="82%">
          <stop offset="0%" stopColor="#fffdf3" />
          <stop offset="62%" stopColor="#f1e3bf" />
          <stop offset="100%" stopColor="#d3bf93" />
        </radialGradient>
        <linearGradient id="chicken-crest" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f06a5f" />
          <stop offset="100%" stopColor="#c8443d" />
        </linearGradient>
      </defs>

      <ellipse cx="32" cy="66" rx="15" ry="4" fill="#000" opacity="0.32" />

      <g stroke="#c9b383" strokeWidth="0.7" fill="#ead9b2">
        <path d="M20 52 C12 57 12 64 18 64 C23 64 24 58 25 54 Z" />
        <path d="M32 54 C28 61 30 66 34 65 C39 64 38 58 37 54 Z" />
        <path d="M44 52 C51 57 52 64 46 64 C41 64 40 58 39 54 Z" />
      </g>

      <ellipse cx="32" cy="43" rx="18" ry="17" fill="url(#chicken-back)" stroke="#cdba8f" strokeWidth="0.8" />

      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center top" }}
        animate={flapping ? { rotate: [0, -24, 12, 0] } : { rotate: [0, -4, 3, 0] }}
        transition={flapping ? { duration: 0.5 } : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M16 33 C8 36 7 46 13 51 C18 53 21 48 20 42 Z" fill="#ead9b2" stroke="#cdba8f" strokeWidth="0.8" />
      </motion.g>
      <motion.g
        style={{ transformBox: "fill-box", transformOrigin: "center top" }}
        animate={flapping ? { rotate: [0, 24, -12, 0] } : { rotate: [0, 4, -3, 0] }}
        transition={flapping ? { duration: 0.5 } : { duration: 3.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <path d="M48 33 C56 36 57 46 51 51 C46 53 43 48 44 42 Z" fill="#ead9b2" stroke="#cdba8f" strokeWidth="0.8" />
      </motion.g>

      <circle cx="32" cy="24" r="13" fill="url(#chicken-back)" stroke="#cdba8f" strokeWidth="0.8" />

      <path
        d="M22 15 C20 7 26 5 28 11 C29 3 35 3 36 10 C38 4 44 7 42 15 Z"
        fill="url(#chicken-crest)"
        stroke="#a93630"
        strokeWidth="0.6"
      />
      <path d="M32 3 L37.5 12 L26.5 12 Z" fill="#f5a623" stroke="#d9821a" strokeWidth="0.6" />
      <path d="M32 14 L35.5 19 L28.5 19 Z" fill="#f5a623" stroke="#d9821a" strokeWidth="0.6" />

      <motion.g
        animate={{ scaleY: [1, 1, 0.12, 1, 1] }}
        transition={{ duration: 4.2, repeat: Infinity, times: [0, 0.9, 0.94, 0.98, 1] }}
        style={{ transformBox: "fill-box", transformOrigin: "center" }}
      >
        <circle cx="26.5" cy="23" r="2.1" fill="#2a2320" />
        <circle cx="37.5" cy="23" r="2.1" fill="#2a2320" />
        <circle cx="27.2" cy="22.3" r="0.7" fill="#fff" />
        <circle cx="38.2" cy="22.3" r="0.7" fill="#fff" />
      </motion.g>

      <path d="M29 31 C28 35 31 36 32 33 C33 36 36 35 35 31 Z" fill="#e0564f" />

      <g stroke="#f5a623" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M26 58 L24 63 L20 64 M24 63 L26 65" />
        <path d="M38 58 L40 63 L44 64 M40 63 L38 65" />
      </g>
    </svg>
  );
}

function Feather({ index }: { index: number }) {
  const angle = (index / 7) * Math.PI * 2 + 0.35;
  const distance = 42 + (index % 4) * 12;
  return (
    <motion.span
      className="absolute left-1/2 top-1/2 z-40 block size-2 rounded-[100%_0_100%_0] bg-[#f1e3bf] shadow-[0_0_6px_rgba(241,227,191,0.5)]"
      initial={{ x: 0, y: 0, opacity: 0, rotate: 0, scale: 0.4 }}
      animate={{
        x: Math.cos(angle) * distance,
        y: Math.sin(angle) * distance - 18,
        opacity: [0, 1, 0],
        rotate: 220 + index * 24,
        scale: [0.4, 1, 0.7],
      }}
      transition={{ duration: 1.15, delay: 0.28, ease: "easeOut" }}
      style={{ marginLeft: -4, marginTop: -4 }}
    />
  );
}

function Confetti({ betKey }: { betKey: string }) {
  const colors = ["#d8b878", "#4fd39b", "#e06c6c", "#f4f1e8", "#7fb2d9"];
  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-40 h-40 overflow-hidden">
      {Array.from({ length: 18 }, (_, index) => {
        const left = 8 + ((index * 37) % 84);
        const drift = ((index % 5) - 2) * 22;
        return (
          <motion.span
            key={`${betKey}-confetti-${index}`}
            className="absolute top-2 block size-1.5 rounded-[2px]"
            style={{ left: `${left}%`, backgroundColor: colors[index % colors.length] }}
            initial={{ y: -12, x: 0, opacity: 0, rotate: 0 }}
            animate={{ y: 120 + (index % 4) * 16, x: drift, opacity: [0, 1, 1, 0], rotate: 320 + index * 30 }}
            transition={{ duration: 1.5 + (index % 4) * 0.22, delay: 0.15 + (index % 5) * 0.06, ease: "easeOut" }}
          />
        );
      })}
    </div>
  );
}

export type ChickenSceneProps = {
  lanes: number;
  currentLane: number;
  levelMultipliers: number[];
  isActive: boolean;
  settled: boolean;
  lost: boolean;
  deathLane?: number | null;
  multiplier: number;
  potentialCents: number;
  stakeCents: number;
  betKey: string;
};

export function ChickenScene({
  lanes,
  currentLane,
  levelMultipliers,
  isActive,
  settled,
  lost,
  deathLane,
  multiplier,
  potentialCents,
  stakeCents,
  betKey,
}: ChickenSceneProps) {
  const crossedAll = settled && !lost && currentLane >= lanes;
  const cashedOut = settled && !lost && currentLane < lanes;
  const roadHeight = lanes * LANE_HEIGHT;
  const chickenLane = Math.min(currentLane, lanes);
  const chickenBottom = chickenLane * LANE_HEIGHT + 4;
  const mood: "idle" | "hop" | "hit" | "win" | "cash" = lost
    ? "hit"
    : crossedAll
      ? "win"
      : cashedOut
        ? "cash"
        : isActive
          ? "hop"
          : "idle";
  const crashLane = lost ? deathLane ?? null : null;
  const resultCents = lost ? -stakeCents : settled ? potentialCents - stakeCents : 0;

  const chicken = (
    <div className="relative size-full">
      <span
        className={cn(
          "pointer-events-none absolute left-1/2 top-1/2 -z-10 size-16 -translate-x-1/2 -translate-y-1/2 rounded-full blur-xl",
          lost ? "bg-red/30" : crossedAll ? "bg-gold/25" : isActive ? "bg-gold/15" : "bg-white/10",
        )}
      />
      <ChickenSprite mood={mood} />
      {isActive && !settled ? (
        <motion.span
          className="pointer-events-none absolute inset-x-0 -top-5 flex justify-center text-gold/70"
          animate={{ y: [0, -4, 0], opacity: [0.35, 0.9, 0.35] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <ChevronsUp className="size-3.5" />
        </motion.span>
      ) : null}
      {isActive && currentLane > 0 ? (
        <motion.span
          key={`dust-${betKey}-${currentLane}`}
          className="pointer-events-none absolute inset-x-2 bottom-0 h-2 rounded-full bg-white/20 blur-[3px]"
          initial={{ opacity: 0.5, scaleX: 0.6, scaleY: 1 }}
          animate={{ opacity: 0, scaleX: 1.5, scaleY: 1.8 }}
          transition={{ duration: 0.55 }}
        />
      ) : null}
    </div>
  );

  return (
    <div className="relative overflow-hidden rounded-2xl border border-line/50 bg-[#0a0e0b]">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_-8%,rgba(216,184,120,0.16),transparent_54%)]" />
      <div className="pointer-events-none absolute -left-20 top-10 size-52 rounded-full bg-[#4fd39b]/[0.06] blur-3xl" />
      <div className="pointer-events-none absolute -right-16 bottom-0 size-48 rounded-full bg-[#e0a06c]/[0.07] blur-3xl" />

      <motion.div
        className="relative px-3 pb-3 pt-2 sm:px-6"
        animate={lost ? { x: [0, -7, 7, -4, 4, 0], y: [0, 3, -3, 2, -2, 0] } : { x: 0, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="relative mx-auto w-full max-w-[600px]">
          <div className="relative z-20 mb-1.5 flex h-11 items-center justify-between overflow-hidden rounded-lg border border-gold/20 px-3">
            <div
              className="absolute inset-0 opacity-[0.14]"
              style={{
                backgroundImage: "repeating-conic-gradient(#d8b878 0% 25%, #0f1411 0% 50%)",
                backgroundSize: "14px 14px",
              }}
            />
            <span className="absolute inset-0 bg-gradient-to-r from-gold/10 via-transparent to-gold/10" />
            <span className="relative flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-gold">
              <Flag className="size-3" /> Finish
            </span>
            <span className="relative flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.18em] text-gold/70">
              {crossedAll ? "Cleared" : `${lanes} lanes`}
              <Trophy className="size-3.5" />
            </span>
          </div>

          <div className="relative" style={{ height: roadHeight }}>
            <div className="pointer-events-none absolute inset-0 rounded-lg border border-white/10 bg-[linear-gradient(180deg,#1d2620_0%,#151c17_45%,#0e1410_100%)] shadow-[inset_0_0_46px_rgba(0,0,0,0.55)]" />
            <div
              className="pointer-events-none absolute inset-0 rounded-lg opacity-[0.05]"
              style={{
                backgroundImage: "radial-gradient(#ffffff 0.5px, transparent 0.5px)",
                backgroundSize: "7px 7px",
              }}
            />
            <div className="pointer-events-none absolute inset-y-0 -left-3 w-1.5 rounded-full bg-[linear-gradient(180deg,rgba(216,184,120,0.55),rgba(38,50,43,0.14))] shadow-[0_0_16px_rgba(216,184,120,0.25)] sm:-left-4" />
            <div className="pointer-events-none absolute inset-y-0 -right-3 w-1.5 rounded-full bg-[linear-gradient(180deg,rgba(216,184,120,0.55),rgba(38,50,43,0.14))] shadow-[0_0_16px_rgba(216,184,120,0.25)] sm:-right-4" />
            <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_50%_0%,rgba(216,184,120,0.18),transparent_70%)]" />
            <div className="pointer-events-none absolute inset-x-2 -top-1.5 z-20 h-2">
              <motion.span
                className="absolute left-0 top-0 h-1.5 w-[46%] origin-left rounded-full border border-black/40 shadow-[0_2px_8px_rgba(0,0,0,0.5)]"
                style={{
                  backgroundImage: "repeating-linear-gradient(90deg, #e06c6c 0 10px, #f4f1e8 10px 20px)",
                }}
                animate={crossedAll ? { rotate: -76 } : { rotate: 0 }}
                transition={{ type: "spring", stiffness: 170, damping: 17 }}
              />
              <span className="absolute -left-1 -top-1 size-2.5 rounded-full border border-black/40 bg-gold/80 shadow-[0_0_10px_rgba(216,184,120,0.6)]" />
            </div>

            {Array.from({ length: lanes }, (_, lane) => {
              const crossed = currentLane > lane;
              const current = lane === currentLane && isActive;
              const fatal = crashLane === lane;
              const traffic = TRAFFIC.find((item) => item.lane === lane);
              const hideTraffic = fatal || (current && isActive);
              return (
                <div
                  key={lane}
                  className="absolute inset-x-0"
                  style={{ bottom: lane * LANE_HEIGHT, height: LANE_HEIGHT }}
                >
                  <div
                    className={cn(
                      "relative h-full overflow-hidden border-b border-dashed border-white/[0.09] transition-colors duration-300",
                      fatal
                        ? "bg-red/[0.16]"
                        : crossed
                          ? "bg-green/[0.08]"
                          : current
                            ? "bg-gold/[0.12]"
                            : lane % 2 === 0
                              ? "bg-white/[0.026]"
                              : "bg-black/[0.08]",
                    )}
                  >
                    <span
                      className={cn(
                        "absolute left-1.5 top-1.5 z-10 font-mono text-[8px] font-semibold tabular-nums",
                        fatal ? "text-red" : crossed ? "text-green/80" : current ? "text-gold" : "text-muted/45",
                      )}
                    >
                      {String(lane + 1).padStart(2, "0")}
                    </span>
                    <span
                      className={cn(
                        "absolute right-1.5 top-1.5 z-10 font-mono text-[8px] font-semibold tabular-nums",
                        crossed ? "text-green/80" : current ? "text-gold" : "text-muted/50",
                      )}
                    >
                      {formatMultiplier(levelMultipliers[lane + 1] ?? 1)}
                    </span>

                    {crossed ? (
                      <span className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 gap-2 text-green/20">
                        <Footprints className="size-3 -rotate-12" />
                        <Footprints className="size-3 translate-y-1 -rotate-12" />
                      </span>
                    ) : null}

                    {traffic && !hideTraffic ? (
                      <motion.div
                        className="absolute top-1/2 -translate-y-1/2 opacity-85"
                        initial={{ left: traffic.direction === 1 ? "-28%" : "112%" }}
                        animate={{ left: traffic.direction === 1 ? "112%" : "-28%" }}
                        transition={{
                          duration: traffic.duration,
                          delay: traffic.delay,
                          repeat: Infinity,
                          repeatType: "loop",
                          repeatDelay: traffic.repeatDelay,
                          ease: "linear",
                        }}
                      >
                        <CarSprite
                          color={traffic.color}
                          direction={traffic.direction}
                          className="h-7 w-20 sm:h-8 sm:w-24"
                        />
                      </motion.div>
                    ) : null}

                    {fatal ? (
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(115deg,rgba(224,108,108,0.2)_0_8px,transparent_8px_20px)]" />
                    ) : null}
                  </div>
                </div>
              );
            })}

            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-[radial-gradient(ellipse_at_50%_100%,rgba(216,184,120,0.2),transparent_72%)]" />
            <div className="pointer-events-none absolute bottom-2 left-2 z-10 flex items-center gap-1 rounded-full border border-green/25 bg-[#0b1712]/80 px-2 py-0.5 text-[7px] font-semibold uppercase tracking-[0.16em] text-green/70">
              <Footprints className="size-2.5" /> Start
            </div>

            <motion.div
              className="absolute left-1/2 z-30 size-[60px] -translate-x-1/2"
              animate={{ bottom: chickenBottom }}
              transition={{ type: "spring", stiffness: 320, damping: 26 }}
            >
              {lost ? (
                <motion.div
                  className="size-full"
                  initial={{ x: 0, y: 0, rotate: 0, opacity: 1 }}
                  animate={{ x: 46, y: -34, rotate: 220, opacity: [1, 1, 0.75] }}
                  transition={{ duration: 0.75, delay: 0.34, ease: "easeOut" }}
                >
                  {chicken}
                </motion.div>
              ) : crossedAll ? (
                <motion.div
                  className="size-full"
                  animate={{ y: [0, -16, 0, -9, 0], rotate: [0, -7, 6, 0], scale: [1, 1.12, 0.98, 1] }}
                  transition={{ duration: 0.9, delay: 0.1 }}
                >
                  {chicken}
                </motion.div>
              ) : cashedOut ? (
                <motion.div
                  className="size-full"
                  animate={{ y: [0, -13, 0, -7, 0], rotate: [0, 6, -5, 0], scale: [1, 1.1, 1] }}
                  transition={{ duration: 0.8 }}
                >
                  {chicken}
                </motion.div>
              ) : isActive ? (
                <motion.div
                  key={`hop-${betKey}-${currentLane}`}
                  className="size-full"
                  initial={{ y: 0, scaleY: 1 }}
                  animate={{ y: [0, -15, 0], scaleY: [1, 1.12, 1], scaleX: [1, 0.94, 1] }}
                  transition={{ duration: 0.42, ease: "easeOut" }}
                >
                  {chicken}
                </motion.div>
              ) : (
                <motion.div
                  className="size-full"
                  animate={{ y: [0, -2.5, 0] }}
                  transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
                >
                  {chicken}
                </motion.div>
              )}

              {lost ? (
                <div className="pointer-events-none absolute inset-0 z-40">
                  {Array.from({ length: 8 }, (_, index) => (
                    <Feather key={`${betKey}-feather-${index}`} index={index} />
                  ))}
                </div>
              ) : null}
            </motion.div>

            {crashLane !== null ? (
              <div
                className="pointer-events-none absolute inset-x-0 z-20"
                style={{ bottom: crashLane * LANE_HEIGHT + LANE_HEIGHT / 2 - 13 }}
              >
                <motion.div
                  className="absolute top-0"
                  initial={{ left: "-26%", opacity: 0 }}
                  animate={{ left: "43%", opacity: 1 }}
                  transition={{ duration: 0.38, delay: 0.12, ease: [0.55, 0, 0.9, 0.45] }}
                >
                  <CarSprite color="#e06c6c" direction={1} className="h-8 w-24 drop-shadow-[0_0_18px_rgba(224,108,108,0.55)]" />
                </motion.div>
              </div>
            ) : null}

            {settled ? (
              <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center">
                <motion.div
                  key={`result-${betKey}`}
                  initial={{ opacity: 0, y: 10, scale: 0.85 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ delay: 0.45, type: "spring", stiffness: 220, damping: 18 }}
                >
                  <div
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-2xl border px-5 py-3 text-center shadow-[0_18px_40px_rgba(0,0,0,0.55)] backdrop-blur-md",
                      lost
                        ? "border-red/40 bg-[#2a1111]/85"
                        : crossedAll
                          ? "border-gold/45 bg-[#241d0f]/85"
                          : "border-green/40 bg-[#0d2118]/85",
                    )}
                  >
                    <span
                      className={cn(
                        "text-[8px] font-semibold uppercase tracking-[0.22em]",
                        lost ? "text-red/80" : crossedAll ? "text-gold/80" : "text-green/80",
                      )}
                    >
                      {lost ? "Traffic hit" : crossedAll ? "Safely across" : "Cashed out"}
                    </span>
                    <span
                      className={cn(
                        "font-display text-2xl leading-none tabular-nums",
                        lost ? "text-red" : crossedAll ? "text-gold" : "text-green",
                      )}
                    >
                      {lost ? `-${formatCents(stakeCents)}` : `${resultCents >= 0 ? "+" : ""}${formatCents(resultCents)}`}
                    </span>
                  </div>
                </motion.div>
              </div>
            ) : null}
          </div>

          <div className="relative z-20 mt-1.5 flex h-10 items-center justify-between overflow-hidden rounded-lg border border-line/50 bg-[#0c110e] px-3">
            <span className="flex items-center gap-1.5 text-[8px] font-semibold uppercase tracking-[0.22em] text-muted/50">
              <Footprints className="size-3" /> Start line
            </span>
            <span className="text-[8px] font-semibold uppercase tracking-[0.16em] text-muted/40">
              {isActive ? `${formatMultiplier(multiplier)} locked` : "Hop lane by lane"}
            </span>
          </div>
        </div>

        {crossedAll ? <Confetti betKey={betKey} /> : null}

        {lost ? (
          <motion.div
            className="pointer-events-none absolute inset-0 z-40 bg-red/25"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 0.45, 0] }}
            transition={{ duration: 0.55, delay: 0.3 }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}
