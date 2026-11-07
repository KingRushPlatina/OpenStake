"use client";

import Link from "next/link";
import { ShieldCheck } from "lucide-react";

const rules: [string, string][] = [
  ["Blackjack", "3:2"],
  ["Dealer", "Soft 17"],
  ["Double", "Any two"],
  ["Split", "Up to 4"],
  ["Insurance", "2:1"],
  ["Shoe", "6 decks"],
];

export function RulesCard() {
  return (
    <section className="surface p-5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/55">House rules</p>
      <div className="mt-4 space-y-2.5">
        {rules.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between text-[10px]">
            <span className="text-muted/65">{label}</span>
            <span className="font-medium text-ink/85">{value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function FairnessCard({ serverSeedHash, nonce }: { serverSeedHash?: string; nonce?: number }) {
  return (
    <section className="surface p-5">
      <div className="flex items-center gap-2">
        <ShieldCheck className="size-3.5 text-green" />
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/60">Provably fair</p>
      </div>
      <p className="mt-3 break-all font-mono text-[9px] leading-4 text-muted/50">{serverSeedHash ?? "Preparing seed…"}</p>
      <div className="mt-3 flex items-center justify-between text-[9px] text-muted/45">
        <span>Nonce {nonce?.toLocaleString() ?? "0"}</span>
        <Link href="/fairness" className="font-medium text-gold/80 transition hover:text-gold">Inspect seeds</Link>
      </div>
    </section>
  );
}
