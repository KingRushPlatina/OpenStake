"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  BarChart3,
  Cherry,
  LayoutGrid,
  Rocket,
  ShieldCheck,
  Sparkles,
  TableProperties,
  Trophy,
  Wallet,
} from "lucide-react";
import { useSession } from "@/components/session-provider";
import { useClock } from "@/components/casino/use-clock";
import { useFaucetClaim } from "@/components/casino/use-faucet-claim";
import { cn } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";

const gameLinks = [
  { href: "/", category: "all", label: "All games", icon: LayoutGrid },
  { href: "/?category=originals", category: "originals", label: "Originals", icon: Sparkles },
  { href: "/?category=table", category: "table", label: "Table games", icon: TableProperties },
  { href: "/?category=crash", category: "crash", label: "Crash", icon: Rocket },
  { href: "/?category=slots", category: "slots", label: "Slots", icon: Cherry },
];

const accountLinks = [
  { href: "/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/wallet", label: "Wallet", icon: Wallet },
  { href: "/profile", label: "My stats", icon: BarChart3 },
  { href: "/fairness", label: "Provably fair", icon: ShieldCheck },
];

function CategoryLinks() {
  const pathname = usePathname();
  const params = useSearchParams();
  const currentCategory = params.get("category") ?? "all";
  return (
    <div className="space-y-0.5">
      {gameLinks.map((item) => {
        const active = pathname === "/" && currentCategory === item.category;
        const Icon = item.icon;
        return (
          <Link
            key={item.category}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition",
              active ? "bg-[#213743] text-white shadow-[inset_2px_0_0_#00e701]" : "text-muted hover:bg-white/[0.04] hover:text-white",
            )}
          >
            <Icon className={cn("size-4", active && "text-green")} />
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { session } = useSession();
  const claim = useFaucetClaim();
  const now = useClock();
  const remaining = Math.max(0, new Date(session.faucet.nextClaimAt).getTime() - now);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  const countdownLabel = now === 0 ? "--:--" : `${minutes}:${String(seconds).padStart(2, "0")}`;
  const belowTarget = session.wallet.balanceCents < session.faucet.targetCents;

  return (
    <aside className="fixed bottom-0 left-0 top-16 z-40 hidden w-[232px] flex-col border-r border-line/70 bg-[#0f212e]/55 px-3 py-4 lg:flex">
      <div className="flex-1 overflow-y-auto pr-1">
        <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-muted/65">Play</p>
        <Suspense fallback={<div className="h-40" />}>
          <CategoryLinks />
        </Suspense>

        <p className="px-3 pb-2 pt-6 text-[10px] font-bold uppercase tracking-[0.16em] text-muted/65">Compete</p>
        <div className="space-y-0.5">
          {accountLinks.map((item) => {
            const active = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-[13px] font-semibold transition",
                  active ? "bg-[#213743] text-white shadow-[inset_2px_0_0_#00e701]" : "text-muted hover:bg-white/[0.04] hover:text-white",
                )}
              >
                <Icon className={cn("size-4", active && "text-green")} />
                {item.label}
              </Link>
            );
          })}
        </div>

        <div className="mt-6 rounded-xl border border-line/70 bg-gradient-to-br from-[#1a2c38] to-[#162833] p-3.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] font-bold uppercase tracking-wider text-muted">Faucet</p>
            <span className={cn("size-1.5 rounded-full", session.faucet.available ? "bg-green" : "bg-muted/40")} />
          </div>
          <p className="mt-2 font-display text-lg font-bold text-white">{formatCents(session.wallet.balanceCents)}</p>
          <p className="mt-0.5 text-[10px] leading-4 text-muted">
            {belowTarget
              ? remaining > 0
                ? `Refill to $100 in ${countdownLabel}`
                : "Refill to $100 available"
              : "Spend below $100 to refill"}
          </p>
          <button
            type="button"
            disabled={!session.faucet.available || claim.isPending}
            onClick={() => claim.mutate()}
            className="btn btn-primary mt-3 h-9 w-full text-xs"
          >
            {session.faucet.available ? `Claim ${formatCents(session.faucet.amountCents)}` : "Faucet locked"}
          </button>
        </div>
      </div>
      <div className="mt-4 border-t border-line/60 px-3 pt-3">
        <p className="text-[10px] leading-4 text-muted/55">Play money only. No deposits, withdrawals or real prizes.</p>
      </div>
    </aside>
  );
}
