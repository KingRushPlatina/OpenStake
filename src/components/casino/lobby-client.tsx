"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, ShieldCheck, Sparkles, Trophy, Zap } from "lucide-react";
import { gameCatalog, categories } from "@/modules/games/catalog";
import { GameIcon } from "@/components/casino/game-icon";
import { GameTile } from "@/components/casino/game-tile";
import { LiveBets } from "@/components/casino/live-bets";
import { useSession } from "@/components/session-provider";
import { cn } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";

const categoryLabels = categories;

export function LobbyClient() {
  const params = useSearchParams();
  const { session } = useSession();
  const category = params.get("category") ?? "all";
  const search = (params.get("q") ?? "").toLowerCase().trim();

  const games = useMemo(() => {
    return gameCatalog.filter((game) => {
      const categoryMatch = category === "all" || game.category === category;
      const searchMatch =
        !search ||
        game.name.toLowerCase().includes(search) ||
        game.tagline.toLowerCase().includes(search) ||
        game.description.toLowerCase().includes(search);
      return categoryMatch && searchMatch && (game.available || game.category === "slots");
    });
  }, [category, search]);

  const featured = gameCatalog.filter((game) => game.available && ["dice", "crash", "plinko", "blackjack"].includes(game.id));

  return (
    <div className="space-y-8">
      <section className="hero-grid relative overflow-hidden rounded-2xl border border-line/60 bg-gradient-to-br from-[#183849] via-[#132b39] to-[#0f212e] px-6 py-7 sm:px-9 sm:py-9 lg:min-h-[280px]">
        <div className="absolute -right-20 -top-28 size-80 rounded-full bg-green/10 blur-3xl" />
        <div className="absolute bottom-0 right-[22%] size-40 rounded-full bg-blue/10 blur-3xl" />
        <div className="relative z-10 grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-green/20 bg-green/[0.07] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.15em] text-green">
              <Sparkles className="size-3" />
              Play money · provably fair
            </span>
            <h1 className="mt-5 max-w-xl font-display text-[34px] font-bold leading-[1.03] tracking-[-0.045em] sm:text-[46px]">
              The home of
              <span className="block bg-gradient-to-r from-green via-[#7dffa7] to-[#4ea5ff] bg-clip-text text-transparent">
                original casino games.
              </span>
            </h1>
            <p className="mt-4 max-w-md text-sm leading-6 text-muted">
              Every round is server-side, cryptographically verifiable and settled instantly. Start with $100 and climb
              the leaderboard.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <Link href="/casino/dice" className="btn btn-primary">
                Play Dice <ArrowRight className="size-4" />
              </Link>
              <Link href="/?category=originals" className="btn btn-secondary">
                Explore originals
              </Link>
            </div>
            <div className="mt-7 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted">
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-green" /> 100% server-authoritative
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-blue" /> Seed verification
              </span>
              <span className="flex items-center gap-1.5">
                <span className="size-1.5 rounded-full bg-amber" /> No real money
              </span>
            </div>
          </div>

          <div className="relative hidden h-[230px] lg:block">
            <div className="absolute right-4 top-0 rotate-6 rounded-2xl border border-line/70 bg-[#1a2c38]/95 p-3.5 shadow-2xl" style={{ animation: "float-soft 5s ease-in-out infinite" }}>
              <GameIcon icon="crash" accent="orange" size="lg" />
              <div className="mt-3 flex items-center justify-between gap-8">
                <span className="text-[10px] font-semibold text-muted">Crash</span>
                <span className="text-xs font-black text-green">24.18x</span>
              </div>
            </div>
            <div className="absolute bottom-1 left-3 -rotate-6 rounded-2xl border border-line/70 bg-[#1a2c38]/95 p-3.5 shadow-2xl" style={{ animation: "float-soft 6s ease-in-out infinite 1s" }}>
              <GameIcon icon="dice" accent="blue" size="lg" />
              <div className="mt-3 flex items-center justify-between gap-8">
                <span className="text-[10px] font-semibold text-muted">Dice</span>
                <span className="text-xs font-black text-green">+$420.00</span>
              </div>
            </div>
            <div className="absolute bottom-6 right-24 rounded-xl border border-green/20 bg-[#0c241a]/95 px-4 py-3 shadow-2xl" style={{ animation: "float-soft 4.5s ease-in-out infinite 0.5s" }}>
              <p className="text-[9px] uppercase tracking-widest text-green/80">Next faucet</p>
              <p className="mt-1 font-display text-lg font-bold text-white">+$100.00</p>
            </div>
            <div className="absolute left-28 top-3 size-2 rounded-full bg-green shadow-[0_0_18px_#00e701]" />
            <div className="absolute right-2 bottom-20 size-1.5 rounded-full bg-blue shadow-[0_0_14px_#4ea5ff]" />
          </div>
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_286px]">
        <div className="min-w-0 space-y-7">
          <section className="surface flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-green/10 text-green">
                <Zap className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-bold">Welcome, {session.user.name}</p>
                <p className="mt-0.5 text-[11px] text-muted">
                  Balance {formatCents(session.wallet.balanceCents)} · net{" "}
                  <span className={session.stats.netProfitCents >= 0 ? "text-green" : "text-red"}>
                    {session.stats.netProfitCents >= 0 ? "+" : ""}
                    {formatCents(session.stats.netProfitCents)}
                  </span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 gap-2">
              <Link href="/wallet" className="btn btn-secondary h-9 flex-1 px-3 text-xs sm:flex-none">
                Wallet
              </Link>
              <Link href="/leaderboard" className="btn btn-secondary h-9 flex-1 px-3 text-xs sm:flex-none">
                <Trophy className="size-3.5" /> Ranks
              </Link>
            </div>
          </section>

          {category === "all" && !search ? (
            <section>
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold tracking-tight">Featured originals</h2>
                  <p className="mt-0.5 text-[11px] text-muted">Jump straight into the action</p>
                </div>
                <Link href="/?category=originals" className="text-[11px] font-semibold text-muted hover:text-white">
                  View all
                </Link>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {featured.map((game) => (
                  <Link
                    key={game.id}
                    href={`/casino/${game.id}`}
                    className="group relative flex items-center gap-3 overflow-hidden rounded-xl border border-line/60 bg-gradient-to-r from-[#1a2c38] to-[#162833] p-3 transition hover:border-line hover:from-[#213743]"
                  >
                    <GameIcon icon={game.icon} accent={game.accent} size="md" />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold">{game.name}</p>
                      <p className="mt-0.5 truncate text-[10px] text-muted">{game.tagline}</p>
                    </div>
                    <ArrowRight className="ml-auto size-3.5 shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-green" />
                  </Link>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold tracking-tight">
                  {search ? `Results for “${params.get("q")}”` : categoryLabels.find((item) => item.id === category)?.label ?? "All games"}
                </h2>
                <p className="mt-0.5 text-[11px] text-muted">{games.length} games available</p>
              </div>
              <div className="flex flex-wrap gap-1 rounded-lg bg-[#0f212e] p-1">
                {categoryLabels.map((item) => {
                  const href = item.id === "all" ? "/" : `/?category=${item.id}`;
                  return (
                    <Link
                      key={item.id}
                      href={href}
                      className={cn("tab h-8 px-3 text-[11px]", category === item.id && "tab-active")}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">
              {games.map((game) => (
                <GameTile key={game.id} game={game} />
              ))}
            </div>
            {games.length === 0 ? (
              <div className="surface flex h-48 flex-col items-center justify-center gap-2 text-center">
                <p className="text-sm font-bold">No games found</p>
                <p className="text-xs text-muted">Try another category or search term.</p>
                <Link href="/" className="btn btn-secondary mt-2 h-9 px-4 text-xs">
                  Reset filters
                </Link>
              </div>
            ) : null}
          </section>

          <section className="grid gap-3 sm:grid-cols-3">
            {[
              { icon: ShieldCheck, title: "Provably fair", text: "Every result is verifiable with your seed pair." },
              { icon: Zap, title: "Instant settlement", text: "Server-side wallet updates on every round." },
              { icon: Trophy, title: "Climb the ranks", text: "Track profit, biggest wins and total wagered." },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="surface p-4">
                  <Icon className="size-5 text-green" />
                  <p className="mt-3 text-xs font-bold">{item.title}</p>
                  <p className="mt-1 text-[10px] leading-5 text-muted">{item.text}</p>
                </div>
              );
            })}
          </section>
        </div>

        <div className="hidden xl:block">
          <div className="sticky top-24 space-y-4">
            <LiveBets limit={22} />
            <div className="surface p-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-green" />
                <p className="text-xs font-bold">Fairness, built in</p>
              </div>
              <p className="mt-2 text-[10px] leading-5 text-muted">
                Your active server seed is hashed before play. Rotate it and reveal the previous seed at any time.
              </p>
              <Link href="/fairness" className="mt-3 flex items-center gap-1 text-[10px] font-bold text-green hover:text-[#7dffa7]">
                Verify your seeds <ArrowRight className="size-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
