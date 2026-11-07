"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronDown, Clock3, Plus, Search, Wallet } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { useFaucetClaim } from "@/components/casino/use-faucet-claim";
import { useClock } from "@/components/casino/use-clock";
import { cn } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";
import { Logo } from "./logo";

const navItems = [
  { href: "/", label: "Casino" },
  { href: "/?category=originals", label: "Originals" },
  { href: "/?category=table", label: "Table" },
  { href: "/leaderboard", label: "Leaderboard" },
];

function formatCountdown(target: string, now: number) {
  const remaining = Math.max(0, new Date(target).getTime() - now);
  const minutes = Math.floor(remaining / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function Header() {
  const router = useRouter();
  const { session } = useSession();
  const now = useClock();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const claim = useFaucetClaim();

  const faucetRemaining = new Date(session.faucet.nextClaimAt).getTime() - now;
  const belowTarget = session.wallet.balanceCents < session.faucet.targetCents;
  const faucetLabel = !belowTarget
    ? "Balance above $100"
    : now === 0
      ? "--:--"
      : faucetRemaining > 0
        ? formatCountdown(session.faucet.nextClaimAt, now)
        : `Claim ${formatCents(session.faucet.amountCents)}`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-16 border-b border-line/80 bg-[#0f212e]/92 backdrop-blur-xl">
      <div className="flex h-full items-center gap-3 px-4 sm:px-6">
        <Logo />
        <nav className="ml-5 hidden items-center gap-1 xl:flex">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md px-3 py-2 text-[13px] font-semibold text-muted transition hover:bg-white/[0.04] hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <form
          className="ml-auto hidden h-10 w-[min(300px,24vw)] items-center gap-2 rounded-lg border border-transparent bg-[#1a2c38] px-3 transition focus-within:border-line lg:flex"
          onSubmit={(event) => {
            event.preventDefault();
            router.push(query.trim() ? `/?q=${encodeURIComponent(query.trim())}` : "/");
          }}
        >
          <Search className="size-4 text-muted" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search games"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-muted/60"
          />
          <kbd className="hidden rounded border border-line/80 bg-[#0f212e] px-1.5 py-0.5 text-[10px] font-semibold text-muted xl:block">
            /
          </kbd>
        </form>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <button
            type="button"
            onClick={() => claim.mutate()}
            disabled={!session.faucet.available || claim.isPending}
            className={cn(
              "hidden h-10 items-center gap-2 rounded-lg px-3 text-xs font-bold transition sm:flex",
              session.faucet.available
                ? "bg-green/10 text-green hover:bg-green/15"
                : "bg-[#1a2c38] text-muted",
            )}
            title={belowTarget ? "Refill your balance to 100 USD" : "Faucet is available below 100 USD"}
          >
            {session.faucet.available ? <Plus className="size-4" /> : <Clock3 className="size-3.5" />}
            {faucetLabel}
          </button>

          <Link
            href="/wallet"
            className="flex h-10 items-center gap-2 rounded-lg border border-line/80 bg-[#1a2c38] px-2.5 transition hover:bg-[#213743] sm:px-3"
          >
            <span className="grid size-6 place-items-center rounded-full bg-green/15 text-[10px] font-black text-green">$</span>
            <span className="text-balance text-[13px] font-bold text-white">{formatCents(session.wallet.balanceCents)}</span>
            <Wallet className="hidden size-3.5 text-muted sm:block" />
          </Link>

          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((current) => !current)}
              className="flex h-10 items-center gap-2 rounded-lg border border-transparent px-1.5 transition hover:border-line/70 hover:bg-[#1a2c38]"
            >
              <span className="grid size-7 place-items-center rounded-full bg-gradient-to-br from-[#4ea5ff] to-[#1a4c8a] text-[10px] font-black">
                {session.user.name.slice(0, 2).toUpperCase()}
              </span>
              <span className="hidden max-w-24 truncate text-xs font-semibold text-muted md:block">{session.user.name}</span>
              <ChevronDown className={cn("hidden size-3 text-muted transition md:block", menuOpen && "rotate-180")} />
            </button>
            {menuOpen ? (
              <>
                <button
                  type="button"
                  className="fixed inset-0 z-10 cursor-default"
                  onClick={() => setMenuOpen(false)}
                  aria-label="Close menu"
                />
                <div className="surface absolute right-0 top-12 z-20 w-52 overflow-hidden p-1.5 shadow-2xl">
                  <div className="px-3 py-2.5">
                    <p className="text-xs font-bold text-white">{session.user.name}</p>
                    <p className="mt-0.5 text-[10px] text-muted">Guest account · play money</p>
                  </div>
                  <div className="my-1 h-px bg-line/70" />
                  <Link href="/wallet" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-muted hover:bg-white/5 hover:text-white">
                    Wallet & activity
                  </Link>
                  <Link href="/profile" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-muted hover:bg-white/5 hover:text-white">
                    My stats
                  </Link>
                  <Link href="/fairness" onClick={() => setMenuOpen(false)} className="flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold text-muted hover:bg-white/5 hover:text-white">
                    Provably fair
                  </Link>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
