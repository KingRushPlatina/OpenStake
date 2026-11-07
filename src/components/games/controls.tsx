"use client";

import { useState } from "react";
import type { GameMetadata } from "@/modules/games/types";
import { Button } from "@/components/ui/button";
import { useFaucetClaim } from "@/components/casino/use-faucet-claim";
import { cn } from "@/lib/client-utils";
import { formatCents, parseAmountToCents } from "@/lib/money";

export function useBetAmount(game: GameMetadata) {
  const [amount, setAmount] = useState("1.00");
  const amountCents = parseAmountToCents(amount);
  const valid = amountCents >= game.minBetCents;
  return { amount, setAmount, amountCents, valid };
}

export function ControlPanel({
  title,
  children,
  footer,
}: {
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <section className="surface p-5">
      <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/55">{title}</p>
      <div className="mt-4 space-y-4">{children}</div>
      {footer ? <div className="mt-5">{footer}</div> : null}
    </section>
  );
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
  const claim = useFaucetClaim();
  const setCents = (cents: number) => setAmount((Math.max(0, cents) / 100).toFixed(2));
  const shortfall = amountCents > balanceCents;

  return (
    <div>
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-medium text-muted" htmlFor="bet-amount">
          Stake
        </label>
        <span className="text-[9px] text-muted/45">Min ${game.minBetCents / 100} · no maximum</span>
      </div>
      <div className="mt-2 flex h-12 items-center rounded-xl border border-line bg-[#0a0e0c] px-3 transition focus-within:border-gold/40">
        <span className="text-sm text-muted">$</span>
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
          }}
          className="h-full min-w-0 flex-1 bg-transparent px-2 text-[15px] font-semibold text-ink outline-none disabled:opacity-55"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={() => setCents(Math.max(game.minBetCents, balanceCents))}
          className="text-[10px] font-semibold text-gold/80 transition hover:text-gold disabled:opacity-40"
        >
          Max
        </button>
      </div>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[
          { label: "½", value: Math.max(game.minBetCents, Math.floor(amountCents / 2)) },
          { label: "2×", value: amountCents * 2 },
          { label: "All in", value: Math.max(game.minBetCents, balanceCents) },
        ].map((option) => (
          <button
            key={option.label}
            type="button"
            disabled={disabled}
            onClick={() => setCents(option.value)}
            className="h-8 rounded-lg border border-line/70 text-[9px] font-medium text-muted transition hover:border-line-strong hover:text-ink disabled:opacity-40"
          >
            {option.label}
          </button>
        ))}
      </div>
      {shortfall ? (
        <div className="mt-2 flex items-center justify-between gap-2 rounded-lg border border-red/25 bg-red/[0.06] px-2.5 py-2">
          <p className="text-[9px] leading-4 text-red/85">Your balance is lower than this stake.</p>
          <button
            type="button"
            onClick={() => claim.mutate()}
            disabled={claim.isPending}
            className="shrink-0 rounded-md bg-gold px-2 py-1 text-[9px] font-semibold text-[#14100a] transition hover:bg-gold-strong disabled:opacity-50"
          >
            {claim.isPending ? "Reloading…" : "Reload"}
          </button>
        </div>
      ) : null}
      {!amountCents || amountCents < game.minBetCents ? (
        <p className="mt-2 text-[9px] text-red/80">Minimum bet is {formatCents(game.minBetCents)}.</p>
      ) : null}
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
    <div
      className="grid gap-1 rounded-xl border border-line/60 bg-bg/40 p-1"
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          disabled={disabled}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-8 rounded-lg text-[9px] font-semibold uppercase tracking-[0.06em] transition disabled:opacity-40",
            value === option.value ? "bg-surface-3 text-ink shadow-sm" : "text-muted/65 hover:text-ink",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function StatTile({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-xl border border-line/50 bg-bg/30 px-3 py-2.5">
      <p className="text-[8px] font-semibold uppercase tracking-[0.14em] text-muted/45">{label}</p>
      <p className={cn("mt-1 font-display text-lg tabular-nums text-ink", tone)}>{value}</p>
    </div>
  );
}

export function PlayButton({
  children,
  onClick,
  disabled,
  variant = "primary",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  return (
    <Button type="button" size="lg" variant={variant} className="w-full" disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}

export function Stage({
  label,
  status,
  children,
  footer,
  className,
}: {
  label: string;
  status?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("surface relative overflow-hidden", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line/70 px-5 py-4">
        <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-muted/55">{label}</p>
        {status}
      </div>
      <div className="p-5 sm:p-7">{children}</div>
      {footer ? <div className="border-t border-line/60 px-5 py-3.5">{footer}</div> : null}
    </section>
  );
}
