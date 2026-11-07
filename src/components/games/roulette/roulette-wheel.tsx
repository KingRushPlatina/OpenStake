"use client";

import { useEffect, useRef, useState } from "react";
import { ROULETTE_WHEEL, rouletteColor } from "@/lib/roulette";
import { cn } from "@/lib/client-utils";

const CENTER = 256;
const SEGMENT = 360 / ROULETTE_WHEEL.length;
const TRACK_RADIUS = 236;
const POCKET_RADIUS = 206;
const SPIN_MS = 6200;
const DROP_AT_MS = 3800;

function polar(radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: CENTER + radius * Math.cos(radians), y: CENTER + radius * Math.sin(radians) };
}

function sectorPath(inner: number, outer: number, start: number, end: number) {
  const a = polar(outer, start);
  const b = polar(outer, end);
  const c = polar(inner, end);
  const d = polar(inner, start);
  return `M ${a.x} ${a.y} A ${outer} ${outer} 0 0 1 ${b.x} ${b.y} L ${c.x} ${c.y} A ${inner} ${inner} 0 0 0 ${d.x} ${d.y} Z`;
}

function pocketFill(number: number) {
  const color = rouletteColor(number);
  if (color === "green") return "url(#rouletteGreen)";
  if (color === "red") return "url(#rouletteRed)";
  return "url(#rouletteBlack)";
}

export function RouletteWheel({
  spinToken,
  resultNumber,
  spinning,
  onSpinEnd,
}: {
  spinToken: number;
  resultNumber: number | null;
  spinning: boolean;
  onSpinEnd: () => void;
}) {
  const [wheelAngle, setWheelAngle] = useState(0);
  const [ballAngle, setBallAngle] = useState(0);
  const [ballRadius, setBallRadius] = useState(TRACK_RADIUS);
  const [landed, setLanded] = useState(false);
  const [landedIndex, setLandedIndex] = useState<number | null>(null);
  const wheelAngleRef = useRef(0);
  const ballAngleRef = useRef(0);
  const onSpinEndRef = useRef(onSpinEnd);

  useEffect(() => {
    onSpinEndRef.current = onSpinEnd;
  }, [onSpinEnd]);

  useEffect(() => {
    if (spinToken === 0 || resultNumber === null) return;
    const index = ROULETTE_WHEEL.indexOf(resultNumber as (typeof ROULETTE_WHEEL)[number]);
    if (index < 0) return;
    const pocketAngle = index * SEGMENT;

    const nextWheel = wheelAngleRef.current + 360 * 6 + 24 + (index % 5) * 3;
    wheelAngleRef.current = nextWheel;
    setWheelAngle(nextWheel);

    // The ball travels the other way and finishes exactly on the winning pocket.
    const targetMod = (((nextWheel + pocketAngle) % 360) + 360) % 360;
    const base = ballAngleRef.current - 360 * 9;
    const baseMod = (((base % 360) + 360) % 360);
    const delta = (((targetMod - baseMod) % 360) + 360) % 360;
    const nextBall = base + delta;
    ballAngleRef.current = nextBall;
    setBallAngle(nextBall);

    setLanded(false);
    setLandedIndex(index);
    setBallRadius(TRACK_RADIUS);

    const dropTimer = window.setTimeout(() => setBallRadius(POCKET_RADIUS), DROP_AT_MS);
    const endTimer = window.setTimeout(() => {
      setLanded(true);
      onSpinEndRef.current();
    }, SPIN_MS);

    return () => {
      window.clearTimeout(dropTimer);
      window.clearTimeout(endTimer);
    };
  }, [spinToken, resultNumber]);

  const activeIndex = landedIndex ?? (resultNumber === null ? null : ROULETTE_WHEEL.indexOf(resultNumber as (typeof ROULETTE_WHEEL)[number]));

  return (
    <div className="relative mx-auto w-full max-w-[330px] [container-type:inline-size]">
      <div className="absolute inset-[13%] rounded-full bg-[radial-gradient(circle,rgba(216,184,120,0.2),transparent_72%)] blur-2xl" />
      <svg
        viewBox="0 0 512 512"
        role="img"
        aria-label="European roulette wheel"
        className="relative block size-full drop-shadow-[0_28px_60px_rgba(0,0,0,0.55)]"
      >
        <defs>
          <radialGradient id="rouletteRim" cx="38%" cy="28%" r="80%">
            <stop offset="0%" stopColor="#8a5a33" />
            <stop offset="34%" stopColor="#4d2c18" />
            <stop offset="68%" stopColor="#2d180d" />
            <stop offset="100%" stopColor="#160b06" />
          </radialGradient>
          <linearGradient id="rouletteMetal" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#f6d99c" />
            <stop offset="32%" stopColor="#c7a15c" />
            <stop offset="58%" stopColor="#8b692f" />
            <stop offset="82%" stopColor="#e6c98c" />
            <stop offset="100%" stopColor="#9a7538" />
          </linearGradient>
          <radialGradient id="rouletteCone" cx="36%" cy="28%" r="78%">
            <stop offset="0%" stopColor="#f3e4c4" />
            <stop offset="28%" stopColor="#c9b48c" />
            <stop offset="58%" stopColor="#8a7756" />
            <stop offset="82%" stopColor="#4a3c29" />
            <stop offset="100%" stopColor="#1c150e" />
          </radialGradient>
          <radialGradient id="rouletteHub" cx="34%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#f7e8c8" />
            <stop offset="45%" stopColor="#c2a061" />
            <stop offset="100%" stopColor="#3a2a13" />
          </radialGradient>
          <radialGradient id="rouletteGreen" cx="42%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#2aa86b" />
            <stop offset="70%" stopColor="#11663f" />
            <stop offset="100%" stopColor="#063a24" />
          </radialGradient>
          <radialGradient id="rouletteRed" cx="42%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#e0444d" />
            <stop offset="62%" stopColor="#ab1f2a" />
            <stop offset="100%" stopColor="#650f17" />
          </radialGradient>
          <radialGradient id="rouletteBlack" cx="42%" cy="30%" r="80%">
            <stop offset="0%" stopColor="#3a3a3a" />
            <stop offset="64%" stopColor="#181818" />
            <stop offset="100%" stopColor="#050505" />
          </radialGradient>
          <radialGradient id="rouletteBall" cx="34%" cy="28%" r="74%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="48%" stopColor="#f3e8d2" />
            <stop offset="100%" stopColor="#b9a074" />
          </radialGradient>
          <filter id="rouletteBallShadow" x="-60%" y="-60%" width="220%" height="220%">
            <feDropShadow dx="0" dy="2" stdDeviation="2.2" floodColor="#000000" floodOpacity="0.7" />
          </filter>
          <filter id="rouletteGlow" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Stationary wooden bowl */}
        <circle cx={CENTER} cy={CENTER} r="253" fill="url(#rouletteRim)" stroke="#0a0603" strokeWidth="2" />
        <circle cx={CENTER} cy={CENTER} r="246" fill="none" stroke="url(#rouletteMetal)" strokeWidth="2.5" opacity="0.85" />
        <circle cx={CENTER} cy={CENTER} r="241" fill="#0c0805" opacity="0.9" />
        <circle cx={CENTER} cy={CENTER} r={TRACK_RADIUS + 3} fill="none" stroke="#3a2a1a" strokeWidth="7" />
        <circle cx={CENTER} cy={CENTER} r={TRACK_RADIUS} fill="none" stroke="#c7a15c" strokeWidth="0.8" opacity="0.35" />

        {/* Rotating wheel head */}
        <g
          style={{
            transform: `rotate(${wheelAngle}deg)`,
            transformOrigin: "256px 256px",
            transition: `transform ${SPIN_MS}ms cubic-bezier(0.16, 0.72, 0.12, 1)`,
          }}
        >
          <circle cx={CENTER} cy={CENTER} r="229" fill="#1a120b" />
          {ROULETTE_WHEEL.map((number, index) => {
            const center = index * SEGMENT;
            const start = center - SEGMENT / 2;
            const end = center + SEGMENT / 2;
            const label = polar(207, center);
            const isWinner = landed && activeIndex === index;
            return (
              <g key={`pocket-${number}`}>
                <path d={sectorPath(185, 226, start, end)} fill={pocketFill(number)} stroke="#0d0905" strokeWidth="0.9" />
                {isWinner ? (
                  <path
                    d={sectorPath(185, 226, start, end)}
                    fill="none"
                    stroke="#ffe7ad"
                    strokeWidth="2.4"
                    filter="url(#rouletteGlow)"
                  />
                ) : null}
                <text
                  x={label.x}
                  y={label.y}
                  fill="#f7f1e1"
                  fontSize="12"
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="central"
                  style={{ fontFamily: "Inter Variable, ui-sans-serif, sans-serif" }}
                >
                  {number}
                </text>
              </g>
            );
          })}

          {/* Inner cone */}
          <circle cx={CENTER} cy={CENTER} r="184" fill="url(#rouletteCone)" stroke="#2c2013" strokeWidth="1.5" />
          <circle cx={CENTER} cy={CENTER} r="180" fill="none" stroke="#f6d99c" strokeWidth="0.7" opacity="0.32" />
          {Array.from({ length: 8 }).map((_, index) => (
            <g key={`spoke-${index}`} transform={`rotate(${index * 45} ${CENTER} ${CENTER})`}>
              <rect x={CENTER - 1.6} y="60" width="3.2" height="118" rx="1.6" fill="#2c2013" opacity="0.55" />
              <rect x={CENTER - 0.5} y="62" width="1" height="114" fill="#f3e4c4" opacity="0.25" />
            </g>
          ))}
          {Array.from({ length: 8 }).map((_, index) => {
            const point = polar(178, index * 45 + 22.5);
            return (
              <path
                key={`deflector-${index}`}
                d={`M ${point.x} ${point.y - 6} l 4.5 6 l -4.5 6 l -4.5 -6 Z`}
                fill="url(#rouletteMetal)"
                opacity="0.9"
              />
            );
          })}
          <circle cx={CENTER} cy={CENTER} r="46" fill="url(#rouletteHub)" stroke="#2c2013" strokeWidth="1.4" />
          <circle cx={CENTER} cy={CENTER} r="34" fill="none" stroke="#3a2a13" strokeWidth="1" opacity="0.55" />
        </g>

        {/* Ball */}
        <g
          style={{
            transform: `rotate(${ballAngle}deg)`,
            transformOrigin: "256px 256px",
            transition: `transform ${SPIN_MS}ms cubic-bezier(0.14, 0.66, 0.1, 1)`,
          }}
        >
          <g style={{ transform: `translate(0px, ${-ballRadius}px)`, transition: "transform 1250ms cubic-bezier(0.3, 0.72, 0.2, 1)" }}>
            <circle cx={CENTER} cy={CENTER} r="7.2" fill="url(#rouletteBall)" filter="url(#rouletteBallShadow)" />
            <circle cx={CENTER - 2.2} cy={CENTER - 2.4} r="2.2" fill="#ffffff" opacity="0.9" />
          </g>
        </g>

        {/* Static centre cap + result */}
        <circle cx={CENTER} cy={CENTER} r="26" fill="#100b06" stroke="url(#rouletteMetal)" strokeWidth="1.6" />
        <circle cx={CENTER} cy={CENTER} r="21" fill="none" stroke="#f6d99c" strokeWidth="0.6" opacity="0.28" />
        {landed && resultNumber !== null ? (
          <g>
            <circle
              cx={CENTER}
              cy={CENTER}
              r="19"
              fill={rouletteColor(resultNumber) === "red" ? "#7c1220" : rouletteColor(resultNumber) === "green" ? "#0c5737" : "#141414"}
              stroke="#f6d99c"
              strokeWidth="1"
              strokeOpacity="0.55"
            />
            <text
              x={CENTER}
              y={CENTER + 0.5}
              fill="#fff6e1"
              fontSize="17"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="central"
            >
              {resultNumber}
            </text>
          </g>
        ) : (
          <text
            x={CENTER}
            y={CENTER + 0.5}
            fill="#d8b878"
            fontSize={spinning ? "9" : "8"}
            fontWeight="700"
            letterSpacing="1.6"
            textAnchor="middle"
            dominantBaseline="central"
          >
            {spinning ? "SPIN" : "OS"}
          </text>
        )}
      </svg>
      <div
        className={cn(
          "pointer-events-none absolute inset-x-0 -bottom-1 text-center text-[9px] font-semibold uppercase tracking-[0.22em] transition",
          spinning ? "text-gold/70" : "text-muted/35",
        )}
      >
        {spinning ? "No more bets" : "European · single zero"}
      </div>
    </div>
  );
}
