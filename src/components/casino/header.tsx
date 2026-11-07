"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Clock3, Gift, ShieldCheck, UserRound, Wallet } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { useFaucetClaim } from "@/components/casino/use-faucet-claim";
import { useClock } from "@/components/casino/use-clock";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";
import { Logo } from "./logo";

const navItems = [
  { href: "/casino/blackjack", label: "Blackjack" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/fairness", label: "Fairness" },
];

function formatCountdown(target: string, now: number) {
  const remaining = Math.max(0, new Date(target).getTime() - now);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function Header() {
  const pathname = usePathname();
  const { session } = useSession();
  const now = useClock();
  const claim = useFaucetClaim();

  const remaining = new Date(session.faucet.nextClaimAt).getTime() - now;
  const belowTarget = session.wallet.balanceCents < session.faucet.targetCents;
  const faucetLabel = !belowTarget
    ? "Faucet locked"
    : now === 0
      ? "--:--"
      : remaining > 0
        ? formatCountdown(session.faucet.nextClaimAt, now)
        : `Claim ${formatCents(session.faucet.amountCents)}`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[72px] border-b border-line/80 bg-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1480px] items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => {
            const active = pathname === item.href || (item.href === "/casino/blackjack" && pathname.startsWith("/casino"));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "rounded-full px-3.5 py-2 text-[12px] font-medium transition",
                  active ? "bg-surface-2 text-ink" : "text-muted hover:text-ink",
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => claim.mutate()}
            disabled={!session.faucet.available || claim.isPending}
            className={cn(
              "hidden h-9 items-center gap-2 rounded-full border px-3 text-[11px] font-semibold transition sm:flex",
              session.faucet.available
                ? "border-green/25 bg-green/10 text-green hover:bg-green/15"
                : "border-line bg-surface text-muted",
            )}
            title={belowTarget ? "Refill your balance to $100" : "Available below $100"}
          >
            {session.faucet.available ? <Gift className="size-3.5" /> : <Clock3 className="size-3.5" />}
            {faucetLabel}
          </button>

          <button
            type="button"
            onClick={() => claim.mutate()}
            disabled={!session.faucet.available || claim.isPending}
            className={cn(
              "grid size-9 place-items-center rounded-full border transition sm:hidden",
              session.faucet.available ? "border-green/25 bg-green/10 text-green" : "border-line bg-surface text-muted/60",
            )}
            aria-label={session.faucet.available ? "Claim faucet" : "Faucet cooling down"}
          >
            {session.faucet.available ? <Gift className="size-3.5" /> : <Clock3 className="size-3.5" />}
          </button>

          <Link
            href="/wallet"
            className="flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3 transition hover:border-line-strong"
          >
            <span className="text-[11px] text-muted">Balance</span>
            <span className="tabular-nums text-[12px] font-semibold text-ink">{formatCents(session.wallet.balanceCents)}</span>
          </Link>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-2">
                <span className="grid size-7 place-items-center rounded-full border border-gold/25 bg-gold/10 font-display text-[11px] text-gold">
                  {session.user.name.slice(0, 1).toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate text-[11px] font-medium text-muted lg:block">{session.user.name}</span>
                <ChevronDown className="hidden size-3 text-muted lg:block" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <span className="block text-[12px] text-ink">{session.user.name}</span>
                <span className="mt-0.5 block text-[10px] font-normal text-muted">Temporary seat · play money</span>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/wallet">
                  <Wallet className="size-3.5" /> Wallet & activity
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile">
                  <UserRound className="size-3.5" /> My stats
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/fairness">
                  <ShieldCheck className="size-3.5" /> Provably fair
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
