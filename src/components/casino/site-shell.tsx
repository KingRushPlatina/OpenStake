"use client";

import Link from "next/link";
import { Header } from "./header";
import { MobileNav } from "./mobile-nav";
import { OnboardingGate } from "@/components/onboarding/onboarding-gate";

export function SiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="min-h-screen pb-24 pt-[72px] md:pb-10">
        <div className="mx-auto w-full max-w-[1480px] px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          {children}
          <footer className="mt-16 border-t border-line/70 pt-6">
            <div className="flex flex-col gap-4 pb-2 md:flex-row md:items-end md:justify-between">
              <div className="max-w-xl">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold/70">OpenStake Originals</p>
                <p className="mt-2 text-[11px] leading-5 text-muted/70">
                  A play-money originals floor. No deposits, withdrawals, real-money wagering or prizes. 18+ only.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-5 text-[11px] text-muted/70">
                <Link href="/#games" className="transition hover:text-ink">Originals</Link>
                <Link href="/leaderboard" className="transition hover:text-ink">Leaderboard</Link>
                <Link href="/wallet" className="transition hover:text-ink">Wallet</Link>
                <span className="text-muted/40">© 2026 OpenStake</span>
              </div>
            </div>
          </footer>
        </div>
      </main>
      <MobileNav />
      <OnboardingGate />
    </div>
  );
}
