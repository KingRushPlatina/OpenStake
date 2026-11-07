"use client";

import { cn } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";

type ChipSize = "xs" | "sm" | "md" | "lg";

const sizeClasses: Record<ChipSize, string> = {
  xs: "size-6 text-[7px]",
  sm: "size-8 text-[8px]",
  md: "size-11 text-[10px]",
  lg: "size-14 text-[12px]",
};

const denominations = [
  { cents: 100_000, label: "$1K", face: "border-[#d8b878] bg-[#3a2d12] text-[#f6d99c]", edge: "border-[#d8b878]/45" },
  { cents: 50_000, label: "$500", face: "border-[#a78bfa] bg-[#2a1b47] text-[#ddd0ff]", edge: "border-[#a78bfa]/40" },
  { cents: 10_000, label: "$100", face: "border-[#94a3b8] bg-[#15191d] text-[#e2e8f0]", edge: "border-[#94a3b8]/35" },
  { cents: 2_500, label: "$25", face: "border-[#4ade80] bg-[#0f2f21] text-[#b9f6cf]", edge: "border-[#4ade80]/35" },
  { cents: 500, label: "$5", face: "border-[#f87171] bg-[#3a1416] text-[#ffd1d1]", edge: "border-[#f87171]/35" },
  { cents: 100, label: "$1", face: "border-[#cbd5e1] bg-[#eef2f6] text-[#24313d]", edge: "border-[#94a3b8]/45" },
] as const;

export const chipDenominations = denominations;

const denominationByCents = new Map<number, (typeof denominations)[number]>(
  denominations.map((denomination) => [denomination.cents, denomination]),
);

function denominationFor(cents: number) {
  return denominationByCents.get(cents) ?? denominations[denominations.length - 1];
}

export function ChipFace({
  cents,
  size = "md",
  className,
}: {
  cents: number;
  size?: ChipSize;
  className?: string;
}) {
  const denomination = denominationFor(cents);
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full border-2 font-bold shadow-[0_5px_14px_rgba(0,0,0,0.42)]",
        denomination.face,
        sizeClasses[size],
        className,
      )}
    >
      <span className={cn("absolute inset-[3px] rounded-full border border-dashed", denomination.edge)} />
      <span className={cn("absolute inset-0 rounded-full bg-[repeating-conic-gradient(from_0deg,rgba(255,255,255,0.16)_0deg_7deg,transparent_7deg_24deg)] opacity-40")} />
      <span className="relative tabular-nums">{denomination.label}</span>
    </span>
  );
}

export function ChipButton({
  cents,
  selected,
  disabled,
  onClick,
  size = "md",
}: {
  cents: number;
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  size?: ChipSize;
}) {
  const denomination = denominationFor(cents);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={`Select ${formatCents(cents)} chip`}
      aria-pressed={selected}
      className={cn(
        "group relative rounded-full outline-none transition duration-150 disabled:cursor-not-allowed disabled:opacity-35",
        selected ? "-translate-y-1.5" : "hover:-translate-y-0.5",
        "focus-visible:ring-2 focus-visible:ring-gold/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b1711]",
      )}
    >
      <span
        className={cn(
          "absolute inset-0 rounded-full transition",
          selected ? "ring-2 ring-gold ring-offset-2 ring-offset-[#0b1711]" : "ring-0",
        )}
      />
      <ChipFace cents={denomination.cents} size={size} />
      <span className="sr-only">{selected ? "Selected" : "Select"}</span>
    </button>
  );
}

function chipCounts(amountCents: number) {
  let remaining = Math.max(0, Math.floor(amountCents));
  const counts: { cents: number; count: number }[] = [];
  for (const denomination of denominations) {
    const count = Math.floor(remaining / denomination.cents);
    if (count > 0) {
      counts.push({ cents: denomination.cents, count });
      remaining -= count * denomination.cents;
    }
  }
  return counts;
}

export function ChipStack({
  amountCents,
  size = "sm",
  className,
}: {
  amountCents: number;
  size?: ChipSize;
  className?: string;
}) {
  const counts = chipCounts(amountCents);
  if (amountCents <= 0) {
    return (
      <span className={cn("grid size-8 place-items-center rounded-full border border-dashed border-gold/30 text-[9px] text-gold/45", className)}>
        —
      </span>
    );
  }
  return (
    <span className={cn("relative inline-flex items-center", className)}>
      {counts.slice(0, 3).map((chip, index) => (
        <span
          key={chip.cents}
          className={cn("relative", index > 0 && "-ml-3")}
          style={{ transform: `translateY(${index * -2}px)` }}
        >
          <ChipFace cents={chip.cents} size={size} />
        </span>
      ))}
    </span>
  );
}
