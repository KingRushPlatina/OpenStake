"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { cn } from "@/lib/client-utils";
import { formatSignedCents } from "@/lib/money";

export type PlinkoBallData = {
  id: string;
  rows: number;
  path: number[];
  multiplier: number;
  payoutCents: number;
  stakeCents: number;
  landed?: boolean;
};

const PEG_TOP = 11;
const PEG_BOTTOM = 78;
const BUCKET_Y = 86;

function unitPercent(rows: number) {
  return 100 / (rows + 3);
}

function rowTop(row: number, rows: number) {
  if (rows <= 1) return (PEG_TOP + PEG_BOTTOM) / 2;
  return PEG_TOP + (row / (rows - 1)) * (PEG_BOTTOM - PEG_TOP);
}

type Keyframe = { left: string; top: string };

function buildTrajectory(rows: number, path: number[]) {
  const unit = 100 / (rows + 3);
  const x = (units: number) => `${50 + units * unit}%`;

  const points: Keyframe[] = [{ left: "50%", top: "2.2%" }];
  const segments: { duration: number; ease: "easeIn" | "easeOut" }[] = [];

  let rights = 0;
  for (let row = 0; row < rows; row += 1) {
    const before = rights - row / 2;
    if (path[row] === 1) rights += 1;
    const after = rights - (row + 1) / 2;
    const y = rowTop(row, rows);

    points.push({ left: x(before), top: `${y - 1.7}%` });
    segments.push({ duration: 0.082 + row * 0.0022, ease: "easeIn" });

    points.push({ left: x(after), top: `${y + 1.1}%` });
    segments.push({ duration: 0.05, ease: "easeOut" });
  }

  const bucket = rights - rows / 2;
  points.push({ left: x(bucket), top: `${BUCKET_Y}%` });
  segments.push({ duration: 0.32, ease: "easeIn" });

  const total = segments.reduce((sum, segment) => sum + segment.duration, 0);
  const times: number[] = [0];
  let elapsed = 0;
  for (const segment of segments) {
    elapsed += segment.duration;
    times.push(elapsed / total);
  }

  return {
    points,
    times,
    ease: segments.map((segment) => segment.ease),
    durationMs: total * 1000,
    bucketLeft: x(bucket),
    unit,
  };
}

function bucketLabel(multiplier: number) {
  if (multiplier >= 10) return `${Math.round(multiplier)}x`;
  if (Number.isInteger(multiplier)) return `${multiplier}x`;
  return `${multiplier.toFixed(1)}x`;
}

function bucketTone(multiplier: number) {
  if (multiplier >= 10) {
    return "border-gold/45 bg-gradient-to-b from-gold/25 to-gold/[0.03] text-gold shadow-[0_0_16px_rgba(216,184,120,0.22)]";
  }
  if (multiplier >= 2) {
    return "border-gold/20 bg-gradient-to-b from-gold/[0.12] to-transparent text-gold/85";
  }
  if (multiplier >= 1) {
    return "border-line/60 bg-gradient-to-b from-white/[0.07] to-transparent text-ink/60";
  }
  return "border-red/25 bg-gradient-to-b from-red/[0.18] to-transparent text-red/80";
}

function PlinkoBall({
  ball,
  onLanded,
}: {
  ball: PlinkoBallData;
  onLanded: (ball: PlinkoBallData) => void;
}) {
  const trajectory = useMemo(
    () => buildTrajectory(ball.rows, ball.path),
    [ball.rows, ball.path],
  );
  const [landed, setLanded] = useState(false);
  const last = trajectory.points[trajectory.points.length - 1]!;
  const net = ball.payoutCents - ball.stakeCents;
  const win = net >= 0;

  return (
    <>
      <motion.div
        className="absolute z-20 size-3.5 -translate-x-1/2 -translate-y-1/2"
        initial={{ left: trajectory.points[0]!.left, top: trajectory.points[0]!.top }}
        animate={{
          left: trajectory.points.map((point) => point.left),
          top: trajectory.points.map((point) => point.top),
        }}
        transition={{
          duration: trajectory.durationMs / 1000,
          times: trajectory.times,
          ease: trajectory.ease,
        }}
        onAnimationComplete={() => {
          setLanded(true);
          onLanded(ball);
        }}
      >
        <div className="size-full rounded-full bg-[radial-gradient(circle_at_34%_28%,#fff8de_0%,#f4d493_38%,#cb952f_72%,#835715_100%)] shadow-[0_0_12px_rgba(240,205,138,0.7),0_1px_2px_rgba(0,0,0,0.55)]" />
        <span className="absolute left-[26%] top-[22%] size-[30%] rounded-full bg-white/90 blur-[0.4px]" />
      </motion.div>

      {landed ? (
        <>
          <motion.span
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2 rounded-full border border-gold/60"
            style={{ left: last.left, top: last.top }}
            initial={{ width: 12, height: 12, opacity: 0.75 }}
            animate={{ width: 54, height: 54, opacity: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
          />
          <motion.div
            className={cn(
              "pointer-events-none absolute z-[9] -translate-x-1/2 rounded-md border",
              win ? "border-gold/50 bg-gold/[0.08]" : "border-red/40 bg-red/[0.07]",
            )}
            style={{
              left: trajectory.bucketLeft,
              top: `calc(${BUCKET_Y}% - 4px)`,
              bottom: "1.5%",
              width: `calc(${trajectory.unit}% - 3px)`,
            }}
            initial={{ opacity: 0.9 }}
            animate={{ opacity: 0 }}
            transition={{ duration: 1.05, delay: 0.35 }}
          />
          <motion.div
            className={cn(
              "pointer-events-none absolute z-30 -translate-x-1/2 whitespace-nowrap rounded-full border px-2 py-0.5 text-[9px] font-semibold tabular-nums shadow-[0_8px_20px_rgba(0,0,0,0.5)] backdrop-blur",
              win
                ? "border-green/40 bg-[#0d2118]/90 text-green"
                : "border-red/40 bg-[#2a1111]/90 text-red",
            )}
            style={{ left: last.left, top: `calc(${last.top} - 26px)` }}
            initial={{ opacity: 0, y: 6, scale: 0.86 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
          >
            {formatSignedCents(net)}
          </motion.div>
        </>
      ) : null}
    </>
  );
}

export function PlinkoBoard({
  rows,
  multipliers,
  balls,
  onBallLanded,
}: {
  rows: number;
  multipliers: number[];
  balls: PlinkoBallData[];
  onBallLanded: (ball: PlinkoBallData) => void;
}) {
  const unit = unitPercent(rows);
  const pegs = useMemo(() => {
    const list: { left: number; top: number }[] = [];
    for (let row = 0; row < rows; row += 1) {
      const count = row + 3;
      for (let index = 0; index < count; index += 1) {
        const x = index - (row + 2) / 2;
        list.push({ left: 50 + x * unit, top: rowTop(row, rows) });
      }
    }
    return list;
  }, [rows, unit]);

  return (
    <div className="relative mx-auto w-full max-w-[660px]">
      <div className="relative h-[350px] w-full overflow-hidden rounded-2xl border border-line/45 bg-[radial-gradient(ellipse_at_50%_-10%,#1b2620_0%,#0e1511_56%,#070b09_100%)] shadow-[inset_0_0_70px_rgba(0,0,0,0.65)] sm:h-[430px]">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.05]"
          style={{
            backgroundImage: "radial-gradient(#ffffff 0.6px, transparent 0.6px)",
            backgroundSize: "11px 11px",
          }}
        />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-[radial-gradient(ellipse_at_50%_0%,rgba(216,184,120,0.12),transparent_72%)]" />

        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 flex justify-center">
          <div className="relative h-7 w-12 rounded-b-xl border border-white/10 bg-gradient-to-b from-[#1a221d] to-[#0a0f0c] shadow-[inset_0_-9px_14px_rgba(0,0,0,0.6)]">
            <span className="absolute bottom-1 left-1/2 size-2 -translate-x-1/2 rounded-full bg-gold/35 blur-[2px]" />
          </div>
        </div>

        {pegs.map((peg, index) => (
          <span
            key={`peg-${index}`}
            aria-hidden
            className="absolute size-[5px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#e7e5d8]/60 shadow-[0_0_5px_rgba(255,255,255,0.32)] sm:size-1.5"
            style={{ left: `${peg.left}%`, top: `${peg.top}%` }}
          />
        ))}

        {balls.map((ball) => (
          <PlinkoBall key={ball.id} ball={ball} onLanded={onBallLanded} />
        ))}

        {balls.length === 0 ? (
          <motion.span
            aria-hidden
            className="absolute left-1/2 top-[2.2%] z-20 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle_at_34%_28%,#fff8de_0%,#f4d493_38%,#cb952f_72%,#835715_100%)] shadow-[0_0_12px_rgba(240,205,138,0.6)]"
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
          />
        ) : null}

        <div
          className="absolute inset-x-0 bottom-0 flex h-[13%]"
          style={{ paddingLeft: `${unit}%`, paddingRight: `${unit}%` }}
        >
          {multipliers.map((multiplier, index) => (
            <div key={`bucket-${index}`} className="flex-1 px-[1.5px]">
              <div
                className={cn(
                  "flex h-full items-center justify-center rounded-md border font-semibold tabular-nums",
                  rows >= 14 ? "text-[6px] sm:text-[8px]" : "text-[7px] sm:text-[9px]",
                  bucketTone(multiplier),
                )}
              >
                {bucketLabel(multiplier)}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="mt-2 text-center text-[9px] text-muted/40">
        {bucketLabel(multipliers[Math.floor(multipliers.length / 2)] ?? 1)} centre bucket ·{" "}
        {bucketLabel(Math.max(...multipliers))} edge bucket
      </p>
    </div>
  );
}
