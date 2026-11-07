import Link from "next/link";
import { cn } from "@/lib/client-utils";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span className="relative grid size-9 place-items-center rounded-[10px] border border-gold/30 bg-[#11150f] font-display text-[20px] leading-none text-gold shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
        <span className="absolute inset-[3px] rounded-[7px] border border-gold/10" />
        <span className="relative">O</span>
      </span>
      {!compact ? (
        <span className="flex items-baseline gap-1.5">
          <span className="font-display text-[21px] tracking-[-0.03em] text-ink">OpenStake</span>
          <span className="hidden text-[8px] font-semibold uppercase tracking-[0.24em] text-gold/70 sm:block">Originals</span>
        </span>
      ) : null}
    </Link>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-12 place-items-center rounded-xl border border-gold/30 bg-[#11150f] font-display text-2xl text-gold",
        className,
      )}
    >
      O
    </span>
  );
}
