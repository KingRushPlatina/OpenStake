"use client";

import { rouletteColor, rouletteLabel, type RouletteVariant } from "@/modules/games/instant/roulette";

const EUROPEAN_ORDER = [
  0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29,
  7, 28, 12, 35, 3, 26,
];

const AMERICAN_ORDER = [
  0, 28, 9, 26, 30, 11, 7, 20, 32, 17, 5, 22, 34, 15, 3, 24, 36, 13, 1, 37, 27, 10, 25, 29, 12, 8, 19, 31, 18, 6, 21,
  33, 16, 4, 23, 35, 14, 2,
];

function polar(cx: number, cy: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: cx + radius * Math.cos(radians), y: cy + radius * Math.sin(radians) };
}

function colorFor(number: number) {
  const color = rouletteColor(number);
  if (color === "green") return "#1b8a52";
  if (color === "red") return "#b73947";
  return "#1b2a34";
}

export function RouletteWheel({
  variant,
  winner,
  rotation,
}: {
  variant: RouletteVariant;
  winner: number | null;
  rotation: number;
}) {
  const order = variant === "american" ? AMERICAN_ORDER : EUROPEAN_ORDER;
  const angle = 360 / order.length;
  const radius = 94;
  return (
    <div className="relative mx-auto aspect-square w-full max-w-[360px]">
      <div className="absolute inset-[7%] rounded-full bg-black/30 shadow-[0_0_70px_rgba(0,0,0,0.45)]" />
      <div
        className="absolute inset-0 rounded-full border-[7px] border-[#694916] shadow-[inset_0_0_0_2px_#1a1206,0_20px_60px_rgba(0,0,0,0.4)]"
        style={{
          transform: `rotate(${rotation}deg)`,
          transition: "transform 4.2s cubic-bezier(0.12, 0.7, 0.12, 1)",
        }}
      >
        <svg viewBox="0 0 200 200" className="size-full">
          <circle cx="100" cy="100" r="99" fill="#3a2a10" />
          <circle cx="100" cy="100" r="96" fill="#0f212e" />
          {order.map((number, index) => {
            const start = index * angle;
            const end = start + angle;
            const startPoint = polar(100, 100, radius, start);
            const endPoint = polar(100, 100, radius, end);
            const label = polar(100, 100, 72, start + angle / 2);
            return (
              <g key={`${number}-${index}`}>
                <path
                  d={`M 100 100 L ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 0 1 ${endPoint.x} ${endPoint.y} Z`}
                  fill={colorFor(number)}
                  stroke="#0a131a"
                  strokeWidth="0.7"
                />
                <text
                  x={label.x}
                  y={label.y}
                  fill="#f4f7f9"
                  fontSize="4.7"
                  fontWeight="700"
                  textAnchor="middle"
                  dominantBaseline="middle"
                >
                  {rouletteLabel(number)}
                </text>
              </g>
            );
          })}
          <circle cx="100" cy="100" r="22" fill="#0f212e" stroke="#694916" strokeWidth="2.5" />
          <circle cx="100" cy="100" r="17" fill="#152b38" />
          <text x="100" y="101" textAnchor="middle" dominantBaseline="middle" fill="#ffb800" fontSize="12" fontWeight="900">
            O
          </text>
        </svg>
      </div>
      <div className="absolute left-1/2 top-[-5px] z-10 -translate-x-1/2">
        <div className="h-0 w-0 border-x-[9px] border-t-[15px] border-x-transparent border-t-[#ffb800] drop-shadow-[0_2px_6px_rgba(255,184,0,0.5)]" />
      </div>
      {winner !== null ? (
        <div className="absolute inset-[7%] grid place-items-center rounded-full">
          <span className="sr-only">Winning number {rouletteLabel(winner)}</span>
        </div>
      ) : null}
    </div>
  );
}

export const rouletteWheelOrder = { european: EUROPEAN_ORDER, american: AMERICAN_ORDER };
