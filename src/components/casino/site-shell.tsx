"use client";

import Link from "next/link";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { Sidebar } from "./sidebar";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <Sidebar />
      <main className="min-h-screen pb-24 pt-16 lg:pb-10 lg:pl-[232px]">
        <div className="mx-auto w-full max-w-[1640px] px-3 py-4 sm:px-5 sm:py-6 lg:px-7">
          {children}
          <footer className="mt-10 flex flex-col items-center justify-between gap-3 border-t border-line/60 py-6 text-center sm:flex-row sm:text-left">
            <p className="max-w-xl text-[10px] leading-5 text-muted/55">
              OpenStake is a play-money social casino. No deposits, withdrawals, real-money wagering or prizes. 18+ only.
            </p>
            <div className="flex items-center gap-4 text-[10px] font-semibold text-muted/65">
              <Link href="/fairness" className="hover:text-white">Provably fair</Link>
              <Link href="/leaderboard" className="hover:text-white">Leaderboard</Link>
              <Link href="/wallet" className="hover:text-white">Wallet</Link>
            </div>
          </footer>
        </div>
      </main>
      <MobileNav />
    </div>
  );
}
