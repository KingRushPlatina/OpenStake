import Link from "next/link";
import { cn } from "@/lib/client-utils";

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group flex items-center gap-2.5">
      <span className="relative grid size-9 place-items-center overflow-hidden rounded-[10px] bg-gradient-to-br from-[#00e701] via-[#00c94b] to-[#008a3d] font-display text-[19px] font-black text-[#061a0a] shadow-[0_0_24px_rgba(0,231,1,0.22)] transition group-hover:shadow-[0_0_34px_rgba(0,231,1,0.34)]">
        <span className="absolute inset-x-0 top-0 h-1/2 bg-white/20" />
        <span className="relative">O</span>
      </span>
      {!compact ? (
        <span className="font-display text-[17px] font-bold tracking-[-0.03em]">
          Open<span className="text-green">Stake</span>
        </span>
      ) : null}
    </Link>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "grid size-10 place-items-center rounded-xl bg-gradient-to-br from-[#00e701] to-[#008a3d] font-display text-xl font-black text-[#061a0a]",
        className,
      )}
    >
      O
    </span>
  );
}
