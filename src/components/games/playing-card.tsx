"use client";

import { motion } from "motion/react";
import { cn } from "@/lib/client-utils";
import { isRed, rankOf, suitOf } from "@/modules/games/cards";

const suitSymbols = { S: "♠", H: "♥", D: "♦", C: "♣" };
const rankLabels: Record<string, string> = { A: "A", T: "10", J: "J", Q: "Q", K: "K" };

const dimensions = {
  xs: "h-[42px] w-[30px] rounded-[4px]",
  sm: "h-[64px] w-[46px] rounded-[6px]",
  md: "h-[96px] w-[69px] rounded-[8px]",
  lg: "h-[132px] w-[95px] rounded-[10px]",
};

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
  if (!card || hidden) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -14, rotate: -4, scale: 0.94 }}
        animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
        transition={{ delay, type: "spring", stiffness: 260, damping: 24 }}
        className={cn(
          "relative shrink-0 overflow-hidden border border-gold/25 bg-[#0a241b] shadow-[0_10px_24px_rgba(0,0,0,0.4)]",
          dimensions[size],
          className,
        )}
      >
        <span className="absolute inset-[3px] rounded-[4px] border border-gold/15" />
        <span className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_5px,rgba(216,184,120,0.06)_5px,rgba(216,184,120,0.06)_6px)]" />
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-[42%] place-items-center rounded-full border border-gold/25 bg-[#071a14]/80 font-display text-gold/80">
            <span className={cn(size === "xs" && "text-[8px]", size === "sm" && "text-[11px]", size === "md" && "text-base", size === "lg" && "text-xl")}>O</span>
          </span>
        </span>
      </motion.div>
    );
  }

  const rank = rankOf(card);
  const suit = suitOf(card);
  const red = isRed(card);
  const tone = red ? "text-[#a8343f]" : "text-[#17201b]";

  return (
    <motion.div
      initial={{ opacity: 0, y: -14, rotate: -4, scale: 0.94 }}
      animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
      transition={{ delay, type: "spring", stiffness: 260, damping: 24 }}
      className={cn(
        "relative flex shrink-0 flex-col justify-between overflow-hidden border border-black/10 bg-[#f6f3e8] px-1.5 py-1 shadow-[0_10px_24px_rgba(0,0,0,0.35)]",
        dimensions[size],
        className,
      )}
    >
      <div className={cn("flex flex-col items-start leading-none", tone)}>
        <span className={cn("font-display", size === "xs" ? "text-[10px]" : size === "sm" ? "text-[13px]" : "text-[16px]")}>
          {rankLabels[rank] ?? rank}
        </span>
        <span className={cn(size === "xs" ? "text-[8px]" : size === "sm" ? "text-[10px]" : "text-[12px]")}>{suitSymbols[suit]}</span>
      </div>
      <span
        className={cn(
          "absolute inset-0 grid place-items-center",
          tone,
          size === "xs" ? "text-lg" : size === "sm" ? "text-2xl" : size === "md" ? "text-4xl" : "text-5xl",
        )}
      >
        {suitSymbols[suit]}
      </span>
      <div className={cn("flex rotate-180 flex-col items-start leading-none", tone)}>
        <span className={cn("font-display", size === "xs" ? "text-[10px]" : size === "sm" ? "text-[13px]" : "text-[16px]")}>
          {rankLabels[rank] ?? rank}
        </span>
        <span className={cn(size === "xs" ? "text-[8px]" : size === "sm" ? "text-[10px]" : "text-[12px]")}>{suitSymbols[suit]}</span>
      </div>
    </motion.div>
  );
}
