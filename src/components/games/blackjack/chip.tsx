import { cn } from "@/lib/client-utils";

const denominations = [
  { value: 500, tone: "border-[#8a6b3b] bg-[#2a2113] text-[#efd9a8]" },
  { value: 100, tone: "border-[#3f6b5a] bg-[#11291f] text-[#9fe0bd]" },
  { value: 25, tone: "border-[#7c4545] bg-[#2a1515] text-[#f0a3a3]" },
  { value: 5, tone: "border-[#4a5b70] bg-[#151d24] text-[#a9c3dc]" },
  { value: 1, tone: "border-[#5b5b52] bg-[#1b1d19] text-[#d6d3c6]" },
];

function chipCounts(amountCents: number) {
  let remaining = Math.max(0, Math.floor(amountCents / 100));
  const counts: { value: number; tone: string; count: number }[] = [];
  for (const denomination of denominations) {
    const count = Math.floor(remaining / denomination.value);
    if (count > 0) {
      counts.push({ ...denomination, count });
      remaining -= count * denomination.value;
    }
  }
  return counts.slice(0, 3);
}

export function ChipStack({ amountCents, className }: { amountCents: number; className?: string }) {
  const counts = chipCounts(amountCents);
  if (amountCents <= 0) {
    return (
      <span className={cn("grid size-10 place-items-center rounded-full border border-dashed border-gold/30 text-[9px] text-gold/50", className)}>
        —
      </span>
    );
  }

  return (
    <span className={cn("relative inline-flex h-10 items-center", className)}>
      {counts.map((chip, index) => (
        <span
          key={chip.value}
          className={cn(
            "relative -ml-2 grid size-9 place-items-center rounded-full border-2 text-[8px] font-bold shadow-[0_4px_10px_rgba(0,0,0,0.35)] first:ml-0",
            chip.tone,
          )}
          style={{ transform: `translateY(${index * -2}px)` }}
        >
          <span className="absolute inset-[3px] rounded-full border border-dashed border-current opacity-30" />
          {chip.value}
        </span>
      ))}
    </span>
  );
}
