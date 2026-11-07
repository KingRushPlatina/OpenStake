"use client";

import { cn } from "@/lib/client-utils";

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
};

const FACES = [
  { value: 1, transform: "translateZ(var(--die-half))", tone: "die-face-front" },
  { value: 6, transform: "rotateY(180deg) translateZ(var(--die-half))", tone: "die-face-back" },
  { value: 2, transform: "rotateY(90deg) translateZ(var(--die-half))", tone: "die-face-right" },
  { value: 5, transform: "rotateY(-90deg) translateZ(var(--die-half))", tone: "die-face-left" },
  { value: 3, transform: "rotateX(90deg) translateZ(var(--die-half))", tone: "die-face-top" },
  { value: 4, transform: "rotateX(-90deg) translateZ(var(--die-half))", tone: "die-face-bottom" },
] as const;

const FACE_ROTATIONS: Record<number, string> = {
  1: "rotateX(0deg) rotateY(0deg)",
  2: "rotateX(0deg) rotateY(-90deg)",
  3: "rotateX(-90deg) rotateY(0deg)",
  4: "rotateX(90deg) rotateY(0deg)",
  5: "rotateX(0deg) rotateY(90deg)",
  6: "rotateX(0deg) rotateY(180deg)",
};

function DiePips({ value }: { value: number }) {
  return (
    <span className="die-pips">
      {Array.from({ length: 9 }).map((_, index) => {
        const row = Math.floor(index / 3);
        const column = index % 3;
        const filled = PIPS[value]?.some(([r, c]) => r === row && c === column) ?? false;
        return <span key={index} className="die-pip-cell">{filled ? <span className="die-pip" /> : null}</span>;
      })}
    </span>
  );
}

export function RollingDie({
  value,
  rolling,
  rollId,
}: {
  value: number | null;
  rolling: boolean;
  rollId: number;
}) {
  const face = value ?? 1;
  return (
    <div className="die-stage" aria-hidden="true">
      <span key={`shadow-${rollId}`} className={cn("die-shadow", rollId > 0 && "die-shadow-rolling")} />
      <div key={`tumbler-${rollId}`} className={cn("die-tumbler", rollId > 0 && "die-tumbler-rolling")}>
        <div
          className={cn("die-cube", !rolling && "die-cube-idle")}
          style={{ transform: `rotateX(-10deg) rotateY(-14deg) ${FACE_ROTATIONS[face] ?? FACE_ROTATIONS[1]}` }}
        >
          {FACES.map((item) => (
            <div key={item.value} className={cn("die-face", item.tone)} style={{ transform: item.transform }}>
              <DiePips value={item.value} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
