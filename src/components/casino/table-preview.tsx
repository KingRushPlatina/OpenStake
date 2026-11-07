"use client";

import { motion } from "motion/react";
import { PlayingCard } from "@/components/games/playing-card";

function Chip({ value, tone }: { value: string; tone: "gold" | "green" | "ink" }) {
  const palette = {
    gold: "border-gold/50 bg-[#2a2113] text-gold",
    green: "border-green/40 bg-[#0c2b20] text-green",
    ink: "border-white/15 bg-[#1a211d] text-ink/80",
  }[tone];
  return (
    <span className={`relative grid size-8 place-items-center rounded-full border-2 ${palette} text-[8px] font-bold shadow-[0_4px_10px_rgba(0,0,0,0.35)]`}>
      {value}
    </span>
  );
}

export function TablePreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.7, delay: 0.15 }}
      className="table-felt relative overflow-hidden rounded-[26px] border border-[#2c4c3d] p-5 sm:p-7"
    >
      <div className="absolute inset-3 rounded-[20px] border border-gold/15" />
      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-7 pt-6 text-[8px] font-semibold uppercase tracking-[0.24em] text-gold/55">
        <span>Table 01</span>
        <span>6 decks · S17</span>
      </div>

      <div className="relative flex min-h-[360px] flex-col">
        <div className="flex flex-1 flex-col items-center justify-center pt-6">
          <p className="text-[8px] font-semibold uppercase tracking-[0.28em] text-ink/40">Dealer</p>
          <div className="mt-3 flex items-center gap-1.5">
            <PlayingCard card="9S" size="md" delay={0.2} />
            <PlayingCard hidden size="md" delay={0.28} />
          </div>
        </div>

        <div className="relative py-4 text-center">
          <p className="font-display text-[15px] tracking-[0.12em] text-gold/80 sm:text-[18px]">BLACKJACK PAYS 3 TO 2</p>
          <p className="mt-1 text-[7px] font-medium uppercase tracking-[0.26em] text-ink/30">Dealer must stand on 17</p>
        </div>

        <div className="flex flex-1 flex-col items-center justify-end pb-2">
          <div className="flex items-end gap-1.5">
            <PlayingCard card="AS" size="md" delay={0.4} />
            <PlayingCard card="KH" size="md" delay={0.48} />
          </div>
          <div className="mt-3 flex items-center gap-2">
            <div className="flex -space-x-2">
              <Chip value="25" tone="gold" />
              <Chip value="5" tone="green" />
              <Chip value="1" tone="ink" />
            </div>
            <span className="rounded-full border border-gold/20 bg-black/20 px-2.5 py-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-gold/70">
              $31 seat
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
