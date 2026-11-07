"use client";

import { useState } from "react";
import type { GameMetadata } from "@/modules/games/types";
import { formatCents, parseAmountToCents } from "@/lib/money";
import { cn } from "@/lib/client-utils";

export function useBetAmount(game: GameMetadata) {
  const [amount, setAmount] = useState("1.00");
  const amountCents = parseAmountToCents(amount);
  const valid = amountCents >= game.minBetCents && amountCents <= game.maxBetCents;
  return { amount, setAmount, amountCents, valid };
}

export function BetAmountControl({
  game,
  balanceCents,
  amount,
  setAmount,
  disabled,
}: {
  game: GameMetadata;
  balanceCents: number;
  amount: string;
  setAmount: (value: string) => void;
  disabled?: boolean;
}) {
  const amountCents = parseAmountToCents(amount);
  const setCents = (cents: number) => setAmount((Math.max(0, cents) / 100).toFixed(2));

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[11px] font-semibold text-muted" htmlFor="bet-amount">
          Bet amount
        </label>
        <span className="text-[10px] text-muted/70">Balance {formatCents(balanceCents)}</span>
      </div>
      <div className="mt-2 flex h-11 items-center rounded-lg border border-transparent bg-[#0f212e] px-3 transition focus-within:border-green/50">
        <span className="text-sm font-semibold text-muted">$</span>
        <input
          id="bet-amount"
          inputMode="decimal"
          value={amount}
          disabled={disabled}
          onChange={(event) => {
            const next = event.target.value.replace(/[^0-9.]/g, "");
            if ((next.match(/\./g) ?? []).length <= 1) setAmount(next);
          }}
          onBlur={() => {
            const cents = parseAmountToCents(amount);
            if (cents < game.minBetCents) setCents(game.minBetCents);
            else if (cents > game.maxBetCents) setCents(game.maxBetCents);
          }}
          className="h-full min-w-0 flex-1 bg-transparent text-sm font-bold text-white outline-none disabled:opacity-50"
        />
        <span className="text-[10px] font-semibold text-muted/60">USD</span>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[
          { label: "½", value: Math.max(game.minBetCents, Math.floor(amountCents / 2)) },
          { label: "2×", value: Math.min(game.maxBetCents, amountCents * 2) },
          { label: "Max", value: Math.min(game.maxBetCents, Math.max(game.minBetCents, balanceCents)) },
        ].map((button) => (
          <button
            key={button.label}
            type="button"
            disabled={disabled}
            onClick={() => setCents(button.value)}
            className="h-7 rounded-md border border-line/60 bg-[#213743] text-[10px] font-bold text-muted transition hover:bg-[#2a4757] hover:text-white disabled:opacity-40"
          >
            {button.label}
          </button>
        ))}
      </div>
      {amountCents < game.minBetCents || amountCents > game.maxBetCents ? (
        <p className="mt-2 text-[10px] text-red">
          Bet must be between {formatCents(game.minBetCents)} and {formatCents(game.maxBetCents)}
        </p>
      ) : null}
    </div>
  );
}

export function GameSettings({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold text-muted">{title}</p>
      {children}
    </div>
  );
}

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  disabled,
}: {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
}) {
  return (
    <div className="grid gap-1 rounded-lg bg-[#0f212e] p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-8 rounded-md text-[10px] font-bold transition disabled:opacity-40",
            value === option.value ? "bg-[#213743] text-white shadow-sm" : "text-muted hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
