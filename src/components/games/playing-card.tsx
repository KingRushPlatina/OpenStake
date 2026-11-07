"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/client-utils";
import { isRed, rankOf, suitOf } from "@/modules/games/cards";

const suitSymbols = { S: "♠", H: "♥", D: "♦", C: "♣" };
const rankLabels: Record<string, string> = { A: "A", T: "10", J: "J", Q: "Q", K: "K" };

export function PlayingCard({
  card,
  hidden = false,
  size = "md",
  delay = 0,
  className,
}: {
  card?: string | null;
  hidden?: boolean;
  size?: "xs" | "sm" | "md" | "lg";
  delay?: number;
  className?: string;
}) {
  const dimensions = {
    xs: "h-[46px] w-[33px] rounded-[4px] text-[8px]",
    sm: "h-[68px] w-[48px] rounded-md text-[10px]",
    md: "h-[104px] w-[74px] rounded-lg text-sm",
    lg: "h-[140px] w-[100px] rounded-xl text-base",
  }[size];

  if (!card || hidden) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -16, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay, type: "spring", stiffness: 240, damping: 22 }}
        className={cn(
          "relative shrink-0 overflow-hidden border border-white/10 bg-gradient-to-br from-[#22495c] to-[#0d202b] shadow-[0_8px_20px_rgba(0,0,0,0.3)]",
          dimensions,
          className,
        )}
      >
        <span className="absolute inset-1 rounded-[4px] border border-white/10" />
        <span className="absolute inset-0 grid place-items-center font-display text-lg font-black text-green/30">O</span>
        <span className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_4px,rgba(255,255,255,0.025)_4px,rgba(255,255,255,0.025)_5px)]" />
      </motion.div>
    );
  }

  const rank = rankOf(card);
  const suit = suitOf(card);
  const red = isRed(card);
  return (
    <motion.div
      initial={{ opacity: 0, y: -16, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 240, damping: 22 }}
      className={cn(
        "relative flex shrink-0 flex-col justify-between overflow-hidden bg-[#f3f6f8] px-1.5 py-1 text-[#14212b] shadow-[0_8px_20px_rgba(0,0,0,0.3)]",
        dimensions,
        className,
      )}
    >
      <div className={cn("flex flex-col items-start leading-none", red ? "text-[#d63c4a]" : "text-[#1a2c38]")}>
        <span className="font-bold">{rankLabels[rank] ?? rank}</span>
        <span className={size === "xs" ? "text-[7px]" : "text-[10px]"}>{suitSymbols[suit]}</span>
      </div>
      <span className={cn("absolute inset-0 grid place-items-center", size === "xs" ? "text-base" : size === "sm" ? "text-2xl" : "text-4xl", red ? "text-[#d63c4a]" : "text-[#1a2c38]")}>
        {suitSymbols[suit]}
      </span>
      <div className={cn("flex rotate-180 flex-col items-start leading-none", red ? "text-[#d63c4a]" : "text-[#1a2c38]")}>
        <span className="font-bold">{rankLabels[rank] ?? rank}</span>
        <span className={size === "xs" ? "text-[7px]" : "text-[10px]"}>{suitSymbols[suit]}</span>
      </div>
    </motion.div>
  );
}
