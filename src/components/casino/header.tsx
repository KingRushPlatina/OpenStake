"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, LayoutGrid, Loader2, Plus, ShieldCheck, Trophy, UserRound, Wallet } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { UserAvatar } from "@/components/user-avatar";
import { useFaucetClaim } from "@/components/casino/use-faucet-claim";
import { GameMark } from "@/components/casino/game-mark";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { gameCatalog } from "@/modules/games/catalog";
import { cn } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";
import { Logo } from "./logo";

export function Header() {
  const pathname = usePathname();
  const { session } = useSession();
  const claim = useFaucetClaim();
  const belowTarget = session.wallet.balanceCents < session.faucet.targetCents;
  const gamesActive = pathname === "/" || pathname.startsWith("/casino");

  return (
    <header className="fixed inset-x-0 top-0 z-50 h-[72px] border-b border-line/80 bg-bg/90 backdrop-blur-xl">
      <div className="mx-auto flex h-full max-w-[1480px] items-center gap-3 px-4 sm:gap-5 sm:px-6 lg:px-8">
        <Logo />

        <nav className="hidden items-center gap-1 md:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex h-9 items-center gap-2 rounded-full px-3.5 text-[12px] font-medium transition outline-none",
                  gamesActive ? "bg-surface-2 text-ink" : "text-muted hover:text-ink",
                )}
              >
                <LayoutGrid className="size-3.5" />
                Games
                <ChevronDown className="size-3 text-muted/70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-[440px] p-2">
              <div className="flex items-center justify-between px-2.5 pb-2 pt-1.5">
                <p className="text-[9px] font-semibold uppercase tracking-[0.18em] text-muted/45">All games</p>
                <span className="text-[9px] text-muted/40">{gameCatalog.length} originals</span>
              </div>
              <div className="grid grid-cols-2 gap-0.5">
                {gameCatalog.map((game) => (
                  <DropdownMenuItem key={game.id} asChild>
                    <Link href={`/casino/${game.id}`} className="gap-3 px-2.5 py-2">
                      <GameMark icon={game.icon} accent={game.accent} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[11px] font-medium text-ink/90">{game.name}</span>
                        <span className="block truncate text-[9px] text-muted/45">{game.tagline}</span>
                      </span>
                      {pathname === `/casino/${game.id}` ? <span className="size-1.5 rounded-full bg-gold" /> : null}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </div>
              <DropdownMenuSeparator className="my-2" />
              <DropdownMenuItem asChild>
                <Link href="/#games" className="gap-2.5 px-2.5 py-2">
                  <LayoutGrid className="size-4 text-gold/70" />
                  <span className="text-[11px] font-medium">Browse the full floor</span>
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Link
            href="/leaderboard"
            className={cn(
              "flex h-9 items-center gap-2 rounded-full px-3.5 text-[12px] font-medium transition",
              pathname === "/leaderboard" ? "bg-surface-2 text-ink" : "text-muted hover:text-ink",
            )}
          >
            <Trophy className="size-3.5" />
            Leaderboard
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <div className="flex h-9 items-center gap-1 rounded-full border border-line bg-surface pl-3 pr-1">
            <Link
              href="/wallet"
              className="flex items-center gap-2 text-[12px] transition hover:opacity-80"
              aria-label={`Open wallet. Balance ${formatCents(session.wallet.balanceCents)}`}
            >
              <span className="hidden text-[11px] text-muted sm:inline">Balance</span>
              <span className="tabular-nums font-semibold text-ink">{formatCents(session.wallet.balanceCents)}</span>
            </Link>
            <button
              type="button"
              onClick={() => claim.mutate()}
              disabled={!belowTarget || claim.isPending}
              className={cn(
                "grid size-7 place-items-center rounded-full transition",
                belowTarget
                  ? "bg-green/15 text-green hover:bg-green/25"
                  : "text-muted/30 disabled:cursor-default",
              )}
              aria-label={belowTarget ? `Add ${formatCents(session.faucet.amountCents)} to reach ${formatCents(session.faucet.targetCents)}` : `Balance is at ${formatCents(session.faucet.targetCents)}`}
              title={belowTarget ? `Add ${formatCents(session.faucet.amountCents)}` : `Balance is at ${formatCents(session.faucet.targetCents)}`}
            >
              {claim.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-4" />}
            </button>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="gap-2 px-1.5">
                <UserAvatar
                  name={session.user.name}
                  userId={session.user.id}
                  avatarPreset={session.user.avatarPreset}
                  avatarUrl={session.user.avatarUrl}
                  size="sm"
                  className="border-gold/25"
                />
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
                <Link href="/leaderboard">
                  <Trophy className="size-3.5" /> Leaderboard
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
