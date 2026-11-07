"use client";

import { useMemo, type MouseEvent } from "react";
import {
  ROULETTE_SPOTS,
  ROULETTE_SPOT_BY_ID,
  rouletteBetWins,
  rouletteColor,
  type RouletteSpot,
} from "@/lib/roulette";

const ZERO_X = 16;
const ZERO_W = 62;
const GRID_X = ZERO_X + ZERO_W;
const GRID_Y = 20;
const CELL_W = 64;
const CELL_H = 76;
const GRID_W = CELL_W * 12;
const GRID_H = CELL_H * 3;
const COL_X = GRID_X + GRID_W;
const COL_W = 84;
const DOZEN_Y = GRID_Y + GRID_H;
const OUTSIDE_H = 62;
const EVEN_Y = DOZEN_Y + OUTSIDE_H;
const VIEW_W = COL_X + COL_W + 16;
const VIEW_H = EVEN_Y + OUTSIDE_H + 16;

const DAMPER = [
  { cents: 100_000, label: "$1K", face: "#3a2d12", ring: "#d8b878", text: "#f6d99c" },
  { cents: 50_000, label: "$500", face: "#2a1b47", ring: "#a78bfa", text: "#ddd0ff" },
  { cents: 10_000, label: "$100", face: "#15191d", ring: "#94a3b8", text: "#e2e8f0" },
  { cents: 2_500, label: "$25", face: "#0f2f21", ring: "#4ade80", text: "#b9f6cf" },
  { cents: 500, label: "$5", face: "#3a1416", ring: "#f87171", text: "#ffd1d1" },
  { cents: 100, label: "$1", face: "#eef2f6", ring: "#94a3b8", text: "#24313d" },
] as const;

const damperByCents = new Map<number, (typeof DAMPER)[number]>(DAMPER.map((chip) => [chip.cents, chip]));

function chipTone(cents: number) {
  return damperByCents.get(cents) ?? DAMPER[DAMPER.length - 1];
}

function chipLabel(cents: number) {
  const dollars = cents / 100;
  if (dollars >= 1000) {
    const thousands = dollars / 1000;
    return `$${Number.isInteger(thousands) ? thousands : thousands.toFixed(1)}k`;
  }
  return `$${Number.isInteger(dollars) ? dollars : dollars.toFixed(2)}`;
}

function columnOf(number: number) {
  return Math.ceil(number / 3);
}

function rowOf(number: number) {
  return (number - 1) % 3;
}

function numberCell(number: number) {
  const column = columnOf(number);
  const row = rowOf(number);
  return {
    x: GRID_X + (column - 1) * CELL_W,
    y: GRID_Y + (2 - row) * CELL_H,
    w: CELL_W,
    h: CELL_H,
  };
}

function numberCenter(number: number) {
  const cell = numberCell(number);
  return { x: cell.x + cell.w / 2, y: cell.y + cell.h / 2 };
}

function zeroCell() {
  return { x: ZERO_X, y: GRID_Y, w: ZERO_W, h: GRID_H };
}

type Rect = { x: number; y: number; w: number; h: number };

function cellRectFor(spot: RouletteSpot): Rect | null {
  if (spot.kind === "straight") {
    const number = spot.numbers?.[0] ?? 0;
    return number === 0 ? zeroCell() : numberCell(number);
  }
  if (spot.kind === "column") {
    const group = spot.group ?? 1;
    return { x: COL_X, y: GRID_Y + (3 - group) * CELL_H, w: COL_W, h: CELL_H };
  }
  if (spot.kind === "dozen") {
    const group = spot.group ?? 1;
    return { x: GRID_X + (group - 1) * 4 * CELL_W, y: DOZEN_Y, w: 4 * CELL_W, h: OUTSIDE_H };
  }
  return null;
}

const EVEN_SPOTS = [
  { kind: "low" as const, label: "1–18" },
  { kind: "even" as const, label: "EVEN" },
  { kind: "red" as const, label: "RED" },
  { kind: "black" as const, label: "BLACK" },
  { kind: "odd" as const, label: "ODD" },
  { kind: "high" as const, label: "19–36" },
];

function evenRect(index: number): Rect {
  return { x: GRID_X + index * 2 * CELL_W, y: EVEN_Y, w: 2 * CELL_W, h: OUTSIDE_H };
}

function anchorFor(spot: RouletteSpot): { x: number; y: number } {
  if (spot.kind === "straight") {
    const number = spot.numbers?.[0] ?? 0;
    if (number === 0) {
      const cell = zeroCell();
      return { x: cell.x + cell.w / 2, y: cell.y + cell.h / 2 };
    }
    return numberCenter(number);
  }

  if (spot.kind === "split") {
    const numbers = spot.numbers ?? [];
    if (numbers.includes(0)) {
      const number = numbers.find((value) => value !== 0) ?? 1;
      return { x: GRID_X, y: numberCenter(number).y };
    }
    const [a, b] = numbers;
    if (a === undefined || b === undefined) return { x: GRID_X, y: GRID_Y };
    const horizontal = Math.abs(a - b) === 3;
    if (horizontal) {
      const right = Math.max(a, b);
      return { x: GRID_X + (columnOf(right) - 1) * CELL_W, y: numberCenter(a).y };
    }
    const lower = Math.min(a, b);
    const row = rowOf(lower);
    return { x: numberCenter(lower).x, y: GRID_Y + (2 - row) * CELL_H };
  }

  if (spot.kind === "street") {
    const numbers = spot.numbers ?? [];
    if (numbers.includes(0)) {
      const upper = numbers[numbers.length - 1] ?? 2;
      return { x: GRID_X, y: GRID_Y + (2 - (rowOf(upper) - 1)) * CELL_H };
    }
    const first = numbers[0] ?? 1;
    return { x: numberCenter(first).x, y: GRID_Y + GRID_H };
  }

  if (spot.kind === "corner") {
    const first = Math.min(...(spot.numbers ?? [1]));
    const cell = numberCell(first);
    return { x: cell.x + CELL_W, y: cell.y };
  }

  if (spot.kind === "sixline") {
    const first = spot.numbers?.[0] ?? 1;
    return { x: GRID_X + columnOf(first) * CELL_W, y: GRID_Y + GRID_H };
  }

  if (spot.kind === "column") {
    const group = spot.group ?? 1;
    return { x: COL_X + COL_W * 0.78, y: GRID_Y + (3 - group) * CELL_H + CELL_H / 2 };
  }

  if (spot.kind === "dozen") {
    const group = spot.group ?? 1;
    return {
      x: GRID_X + (group - 1) * 4 * CELL_W + 3 * CELL_W,
      y: DOZEN_Y + OUTSIDE_H / 2,
    };
  }

  const index = EVEN_SPOTS.findIndex((entry) => entry.kind === spot.kind);
  const rect = evenRect(index < 0 ? 0 : index);
  return { x: rect.x + rect.w * 0.78, y: rect.y + rect.h / 2 };
}

function hotspotFor(spot: RouletteSpot): Rect {
  const cell = cellRectFor(spot);
  if (cell) return cell;
  const anchor = anchorFor(spot);
  if (spot.kind === "split") {
    const numbers = spot.numbers ?? [];
    const horizontal = numbers.length === 2 && Math.abs(numbers[0]! - numbers[1]!) === 3;
    return horizontal
      ? { x: anchor.x - 16, y: anchor.y - 12, w: 32, h: 24 }
      : { x: anchor.x - 12, y: anchor.y - 16, w: 24, h: 32 };
  }
  if (spot.kind === "corner") return { x: anchor.x - 14, y: anchor.y - 14, w: 28, h: 28 };
  if (spot.kind === "street" || spot.kind === "sixline") {
    return { x: anchor.x - 16, y: anchor.y - 14, w: 32, h: 28 };
  }
  return { x: anchor.x - 18, y: anchor.y - 14, w: 36, h: 28 };
}

function cellFill(number: number) {
  const color = rouletteColor(number);
  if (color === "red") return "url(#feltRed)";
  if (color === "green") return "url(#feltGreen)";
  return "url(#feltBlack)";
}

function SpotChip({
  x,
  y,
  chips,
  winning,
}: {
  x: number;
  y: number;
  chips: number[];
  winning: boolean;
}) {
  if (chips.length === 0) return null;
  const top = chips[chips.length - 1]!;
  const total = chips.reduce((sum, chip) => sum + chip, 0);
  const tone = chipTone(top);
  const stack = Math.min(3, chips.length);
  return (
    <g transform={`translate(${x} ${y})`} className="pointer-events-none">
      {winning ? (
        <circle r="17" fill="none" stroke="#ffe7ad" strokeWidth="2" opacity="0.9" filter="url(#chipGlow)">
          <animate attributeName="opacity" values="0.9;0.35;0.9" dur="1.1s" repeatCount="indefinite" />
        </circle>
      ) : null}
      {Array.from({ length: stack }).map((_, index) => (
        <circle
          key={`stack-${index}`}
          cy={-index * 2.2}
          r="12"
          fill={tone.face}
          stroke="#0a0806"
          strokeWidth="1.6"
          opacity={index === 0 ? 1 : 0.85}
        />
      ))}
      <circle r="12" fill={tone.face} stroke={tone.ring} strokeWidth="2" filter="url(#chipShadow)" />
      <circle r="9" fill="none" stroke={tone.ring} strokeWidth="1" strokeDasharray="2 2" opacity="0.85" />
      <circle r="4.5" fill="#0a0806" opacity="0.18" />
      <text
        y="0.6"
        fill={tone.text}
        fontSize="7.4"
        fontWeight="800"
        textAnchor="middle"
        dominantBaseline="central"
        style={{ fontFamily: "Inter Variable, ui-sans-serif, sans-serif" }}
      >
        {chipLabel(total)}
      </text>
    </g>
  );
}

export function RouletteTable({
  chipsBySpot,
  disabled = false,
  resultNumber,
  onPlace,
  onRemove,
}: {
  chipsBySpot: Map<string, number[]>;
  disabled?: boolean;
  resultNumber: number | null;
  onPlace: (spot: RouletteSpot) => void;
  onRemove: (spot: RouletteSpot) => void;
}) {
  const straightSpots = useMemo(() => ROULETTE_SPOTS.filter((spot) => spot.kind === "straight"), []);
  const splitSpots = useMemo(() => ROULETTE_SPOTS.filter((spot) => spot.kind === "split"), []);
  const streetSpots = useMemo(() => ROULETTE_SPOTS.filter((spot) => spot.kind === "street"), []);
  const cornerSpots = useMemo(() => ROULETTE_SPOTS.filter((spot) => spot.kind === "corner"), []);
  const sixlineSpots = useMemo(() => ROULETTE_SPOTS.filter((spot) => spot.kind === "sixline"), []);
  const columnSpots = useMemo(() => ROULETTE_SPOTS.filter((spot) => spot.kind === "column"), []);
  const dozenSpots = useMemo(() => ROULETTE_SPOTS.filter((spot) => spot.kind === "dozen"), []);
  const evenSpots = useMemo(
    () =>
      EVEN_SPOTS.map((entry) => ({
        entry,
        spot: ROULETTE_SPOTS.find((item) => item.kind === entry.kind)!,
      })),
    [],
  );

  const winningSpotIds = useMemo(() => {
    if (resultNumber === null) return new Set<string>();
    const ids = new Set<string>();
    for (const [id, chips] of chipsBySpot) {
      const spot = ROULETTE_SPOT_BY_ID.get(id);
      if (spot && chips.length > 0 && rouletteBetWins(spot, resultNumber)) ids.add(id);
    }
    return ids;
  }, [chipsBySpot, resultNumber]);

  const handlers = (spot: RouletteSpot) => ({
    onClick: () => {
      if (!disabled) onPlace(spot);
    },
    onContextMenu: (event: MouseEvent) => {
      event.preventDefault();
      if (!disabled) onRemove(spot);
    },
  });

  return (
    <div className="-mx-1 overflow-x-auto pb-1">
      <div className="mx-auto min-w-[560px] max-w-[980px]">
        <svg viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} className="block w-full select-none" role="img" aria-label="European roulette betting table">
          <defs>
            <radialGradient id="felt" cx="46%" cy="0%" r="110%">
              <stop offset="0%" stopColor="#155741" />
              <stop offset="48%" stopColor="#0d3a2b" />
              <stop offset="100%" stopColor="#08271c" />
            </radialGradient>
            <linearGradient id="feltRed" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#a8262f" />
              <stop offset="100%" stopColor="#7d1720" />
            </linearGradient>
            <linearGradient id="feltBlack" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#20211f" />
              <stop offset="100%" stopColor="#0d0e0d" />
            </linearGradient>
            <linearGradient id="feltGreen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#1a8a58" />
              <stop offset="100%" stopColor="#0d5c3a" />
            </linearGradient>
            <linearGradient id="goldLine" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f0d8a4" />
              <stop offset="50%" stopColor="#c7a15c" />
              <stop offset="100%" stopColor="#8b692f" />
            </linearGradient>
            <pattern id="feltTexture" width="6" height="6" patternUnits="userSpaceOnUse">
              <circle cx="1" cy="1" r="0.45" fill="#ffffff" opacity="0.08" />
            </pattern>
            <filter id="chipShadow" x="-50%" y="-50%" width="200%" height="200%">
              <feDropShadow dx="0" dy="2" stdDeviation="1.6" floodColor="#000000" floodOpacity="0.6" />
            </filter>
            <filter id="chipGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} rx="18" fill="url(#felt)" stroke="#2b5a45" strokeWidth="1.5" />
          <rect x="0" y="0" width={VIEW_W} height={VIEW_H} rx="18" fill="url(#feltTexture)" />
          <rect x="7" y="7" width={VIEW_W - 14} height={VIEW_H - 14} rx="13" fill="none" stroke="url(#goldLine)" strokeWidth="1" opacity="0.28" />

          {/* Zero */}
          <g>
            <rect
              x={ZERO_X}
              y={GRID_Y}
              width={ZERO_W}
              height={GRID_H}
              rx="3"
              fill={cellFill(0)}
              stroke="url(#goldLine)"
              strokeWidth="1.2"
            />
            {resultNumber === 0 ? (
              <rect
                x={ZERO_X + 1.5}
                y={GRID_Y + 1.5}
                width={ZERO_W - 3}
                height={GRID_H - 3}
                rx="2"
                fill="none"
                stroke="#ffe7ad"
                strokeWidth="2.6"
                filter="url(#chipGlow)"
              />
            ) : null}
            <text
              x={ZERO_X + ZERO_W / 2}
              y={GRID_Y + GRID_H / 2}
              fill="#f6f1e2"
              fontSize="26"
              fontWeight="800"
              textAnchor="middle"
              dominantBaseline="central"
            >
              0
            </text>
          </g>

          {/* Number grid */}
          {Array.from({ length: 36 }, (_, index) => index + 1).map((number) => {
            const cell = numberCell(number);
            const winner = resultNumber === number;
            return (
              <g key={`cell-${number}`}>
                <rect
                  x={cell.x}
                  y={cell.y}
                  width={cell.w}
                  height={cell.h}
                  fill={cellFill(number)}
                  stroke="#0b2b20"
                  strokeWidth="1"
                />
                {winner ? (
                  <rect
                    x={cell.x + 1.5}
                    y={cell.y + 1.5}
                    width={cell.w - 3}
                    height={cell.h - 3}
                    fill="none"
                    stroke="#ffe7ad"
                    strokeWidth="2.6"
                    filter="url(#chipGlow)"
                  />
                ) : null}
                <text
                  x={cell.x + cell.w / 2}
                  y={cell.y + cell.h / 2}
                  fill="#f6f1e2"
                  fontSize="23"
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

          {/* 2 to 1 column bets */}
          {columnSpots.map((spot) => {
            const rect = cellRectFor(spot)!;
            return (
              <g key={spot.id}>
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.w}
                  height={rect.h}
                  fill="rgba(3, 18, 12, 0.42)"
                  stroke="url(#goldLine)"
                  strokeWidth="1"
                  strokeOpacity="0.55"
                />
                <text
                  x={rect.x + rect.w / 2}
                  y={rect.y + rect.h / 2}
                  fill="#e9d7ad"
                  fontSize="13"
                  fontWeight="700"
                  letterSpacing="0.5"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  2:1
                </text>
              </g>
            );
          })}

          {/* Dozens */}
          {dozenSpots.map((spot) => {
            const rect = cellRectFor(spot)!;
            return (
              <g key={spot.id}>
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.w}
                  height={rect.h}
                  rx="2"
                  fill="rgba(3, 18, 12, 0.42)"
                  stroke="url(#goldLine)"
                  strokeWidth="1"
                  strokeOpacity="0.55"
                />
                <text
                  x={rect.x + rect.w / 2}
                  y={rect.y + rect.h / 2}
                  fill="#e9d7ad"
                  fontSize="14"
                  fontWeight="700"
                  letterSpacing="1.2"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {spot.group === 1 ? "1st 12" : spot.group === 2 ? "2nd 12" : "3rd 12"}
                </text>
              </g>
            );
          })}

          {/* Even money */}
          {evenSpots.map(({ entry }, index) => {
            const rect = evenRect(index);
            return (
              <g key={`even-${entry.kind}`}>
                <rect
                  x={rect.x}
                  y={rect.y}
                  width={rect.w}
                  height={rect.h}
                  rx="2"
                  fill="rgba(3, 18, 12, 0.42)"
                  stroke="url(#goldLine)"
                  strokeWidth="1"
                  strokeOpacity="0.55"
                />
                <text
                  x={rect.x + rect.w / 2}
                  y={rect.y + rect.h / 2}
                  fill="#e9d7ad"
                  fontSize="14"
                  fontWeight="700"
                  letterSpacing="1.1"
                  textAnchor="middle"
                  dominantBaseline="central"
                >
                  {entry.label}
                </text>
                {entry.kind === "red" ? (
                  <circle cx={rect.x + 22} cy={rect.y + rect.h / 2} r="6" fill="#b4232d" stroke="#f0d8a4" strokeWidth="0.8" />
                ) : null}
                {entry.kind === "black" ? (
                  <circle cx={rect.x + 18} cy={rect.y + rect.h / 2} r="6" fill="#0b0b0b" stroke="#f0d8a4" strokeWidth="0.8" />
                ) : null}
              </g>
            );
          })}

          {/* Vertical felt caption in the empty lower-left corner */}
          <text
            x={ZERO_X + ZERO_W / 2}
            y={DOZEN_Y + OUTSIDE_H}
            transform={`rotate(-90 ${ZERO_X + ZERO_W / 2} ${DOZEN_Y + OUTSIDE_H})`}
            fill="#e9d7ad"
            fontSize="8.5"
            fontWeight="700"
            letterSpacing="2.4"
            textAnchor="middle"
            dominantBaseline="central"
            opacity="0.4"
          >
            EUROPEAN ROULETTE
          </text>

          {/* Straight hotspots */}
          {straightSpots.map((spot) => {
            const rect = cellRectFor(spot)!;
            return (
              <rect
                key={`hot-${spot.id}`}
                className="roulette-hotspot"
                data-spot={spot.id}
                aria-label={spot.label}
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                {...handlers(spot)}
              >
                <title>{spot.label}</title>
              </rect>
            );
          })}

          {/* Outside hotspots */}
          {columnSpots.map((spot) => {
            const rect = cellRectFor(spot)!;
            return (
              <rect
                key={`hot-${spot.id}`}
                className="roulette-hotspot"
                data-spot={spot.id}
                aria-label={spot.label}
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                rx="2"
                {...handlers(spot)}
              >
                <title>{spot.label}</title>
              </rect>
            );
          })}
          {dozenSpots.map((spot) => {
            const rect = cellRectFor(spot)!;
            return (
              <rect
                key={`hot-${spot.id}`}
                className="roulette-hotspot"
                data-spot={spot.id}
                aria-label={spot.label}
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                rx="2"
                {...handlers(spot)}
              >
                <title>{spot.label}</title>
              </rect>
            );
          })}
          {evenSpots.map(({ entry, spot }, index) => {
            const rect = evenRect(index);
            return (
              <rect
                key={`hot-${entry.kind}`}
                className="roulette-hotspot"
                data-spot={spot.id}
                aria-label={spot.label}
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                rx="2"
                {...handlers(spot)}
              >
                <title>{spot.label}</title>
              </rect>
            );
          })}

          {/* Split / street / corner / six line hotspots, drawn last so they win on the lines */}
          {[...splitSpots, ...streetSpots, ...cornerSpots, ...sixlineSpots].map((spot) => {
            const rect = hotspotFor(spot);
            return (
              <rect
                key={`hot-${spot.id}`}
                className="roulette-hotspot"
                data-spot={spot.id}
                aria-label={spot.label}
                x={rect.x}
                y={rect.y}
                width={rect.w}
                height={rect.h}
                rx="4"
                {...handlers(spot)}
              >
                <title>{spot.label}</title>
              </rect>
            );
          })}

          {/* Chips */}
          {ROULETTE_SPOTS.map((spot) => {
            const chips = chipsBySpot.get(spot.id);
            if (!chips || chips.length === 0) return null;
            const anchor = anchorFor(spot);
            return (
              <SpotChip
                key={`chip-${spot.id}`}
                x={anchor.x}
                y={anchor.y}
                chips={chips}
                winning={winningSpotIds.has(spot.id)}
              />
            );
          })}
        </svg>
      </div>
    </div>
  );
}
