"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Dices, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useSession } from "@/components/session-provider";
import { apiFetch, ApiError } from "@/lib/api-client";
import { cn } from "@/lib/client-utils";
import { formatCents } from "@/lib/money";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type FaucetRollResult = {
  won: boolean;
  guess: number;
  roll: number;
  amountCents: number;
  balanceCents: number;
  targetCents: number;
};

type TopUpContextValue = {
  openTopUp: () => void;
  isPending: boolean;
};

const TopUpContext = createContext<TopUpContextValue | null>(null);

const PIPS: Record<number, [number, number][]> = {
  1: [[1, 1]],
  2: [
    [0, 0],
    [2, 2],
  ],
  3: [
    [0, 0],
    [1, 1],
    [2, 2],
  ],
  4: [
    [0, 0],
    [2, 0],
    [0, 2],
    [2, 2],
  ],
  5: [
    [0, 0],
    [2, 0],
    [1, 1],
    [0, 2],
    [2, 2],
  ],
  6: [
    [0, 0],
    [2, 0],
    [0, 1],
    [2, 1],
    [0, 2],
    [2, 2],
  ],
};

function DieFace({ value, rolling }: { value: number | null; rolling: boolean }) {
  return (
    <div
      className={cn(
        "relative grid size-[88px] place-items-center rounded-[20px] border border-gold/35 bg-gradient-to-br from-[#faf5e8] to-[#c9b58b] shadow-[0_18px_40px_rgba(0,0,0,0.5)]",
        rolling && "animate-[dice-tumble_620ms_ease-in-out_infinite]",
      )}
    >
      {value === null ? (
        <span className="font-display text-4xl text-[#6d5a38]/70">?</span>
      ) : (
        <div className="grid size-16 grid-cols-3 grid-rows-3 gap-1.5 p-1.5">
          {Array.from({ length: 9 }).map((_, index) => {
            const row = Math.floor(index / 3);
            const column = index % 3;
            const filled = PIPS[value]?.some(([r, c]) => r === row && c === column) ?? false;
            return (
              <span
                key={index}
                className={cn(
                  "rounded-full",
                  filled ? "bg-[#1a150e] shadow-[inset_0_1px_1px_rgba(255,255,255,0.28)]" : "bg-transparent",
                )}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

export function TopUpProvider({ children }: { children: React.ReactNode }) {
  const { session, setBalance, updateSession } = useSession();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [guess, setGuess] = useState<number | null>(null);
  const [lastRoll, setLastRoll] = useState<number | null>(null);
  const [awardedCents, setAwardedCents] = useState(0);
  const [outcome, setOutcome] = useState<"idle" | "won" | "lost">("idle");

  const balanceCents = session.wallet.balanceCents;
  const targetCents = session.faucet.targetCents;
  const amountCents = Math.max(0, targetCents - balanceCents);
  const belowTarget = balanceCents < targetCents;

  const mutation = useMutation({
    mutationFn: async (pick: number) => {
      const [result] = await Promise.all([
        apiFetch<FaucetRollResult>("/api/faucet", {
          method: "POST",
          body: JSON.stringify({ guess: pick }),
        }),
        new Promise((resolve) => setTimeout(resolve, 900)),
      ]);
      return result;
    },
    onSuccess: (result) => {
      setLastRoll(result.roll);
      if (result.won) {
        setOutcome("won");
        setAwardedCents(result.amountCents);
        setBalance(result.balanceCents);
        updateSession((current) => ({
          ...current,
          faucet: {
            ...current.faucet,
            available: false,
            amountCents: 0,
            targetCents: result.targetCents,
          },
        }));
        queryClient.invalidateQueries({ queryKey: ["session"] });
        queryClient.invalidateQueries({ queryKey: ["transactions"] });
        toast.success("Top-up won", {
          description: `${formatCents(result.amountCents)} added. Your balance is back at ${formatCents(result.targetCents)}.`,
        });
        return;
      }
      setOutcome("lost");
      toast.error("The die had other plans", {
        description: `You rolled ${result.roll}. No top-up this time — pick a number and roll again.`,
      });
    },
    onError: (error) => {
      if (error instanceof ApiError && error.code === "FAUCET_BALANCE") {
        queryClient.invalidateQueries({ queryKey: ["session"] });
      }
      toast.error("Top-up unavailable", { description: error.message });
    },
  });

  const openTopUp = useCallback(() => {
    if (balanceCents >= targetCents) {
      toast.info("You are at the cap", {
        description: `Top-ups only fill the gap up to ${formatCents(targetCents)}. Win or lose, your balance stays yours.`,
      });
      return;
    }
    setGuess(null);
    setLastRoll(null);
    setAwardedCents(0);
    setOutcome("idle");
    setOpen(true);
  }, [balanceCents, targetCents]);

  const roll = useCallback(() => {
    if (guess === null || mutation.isPending) return;
    setLastRoll(null);
    setOutcome("idle");
    mutation.mutate(guess);
  }, [guess, mutation]);

  const value = useMemo<TopUpContextValue>(
    () => ({ openTopUp, isPending: mutation.isPending }),
    [openTopUp, mutation.isPending],
  );

  const locked = mutation.isPending || outcome === "won";

  return (
    <TopUpContext.Provider value={value}>
      {children}
      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (mutation.isPending) return;
          setOpen(next);
        }}
      >
        <DialogContent className="p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="grid size-9 place-items-center rounded-xl border border-gold/25 bg-gold/10 text-gold">
                  <Dices className="size-4" />
                </span>
                <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-gold/70">Top-up challenge</p>
              </div>
              <DialogTitle className="mt-4 font-display text-2xl">Roll for your reload</DialogTitle>
              <DialogDescription className="mt-1.5 max-w-sm">
                Pick a number from 1 to 6, then roll the die. If it lands on your number, the gap up to{" "}
                {formatCents(targetCents)} is credited instantly. If not, nothing happens and you can try again.
              </DialogDescription>
            </div>
            <DieFace value={mutation.isPending ? null : (lastRoll ?? guess)} rolling={mutation.isPending} />
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-line/60 bg-bg/30 px-3 py-2.5">
              <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-muted/45">Balance</p>
              <p className="mt-1 font-display text-lg tabular-nums text-ink">{formatCents(balanceCents)}</p>
            </div>
            <div className="rounded-xl border border-gold/20 bg-gold/[0.05] px-3 py-2.5">
              <p className="text-[8px] font-semibold uppercase tracking-[0.16em] text-gold/55">
                {outcome === "won" ? "Top-up won" : "Top-up if you win"}
              </p>
              <p className="mt-1 font-display text-lg tabular-nums text-gold">
                {formatCents(outcome === "won" ? awardedCents : amountCents)}
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-medium text-muted">Your number</p>
              <span className="text-[9px] text-muted/45">1 in 6 chance</span>
            </div>
            <div className="mt-2 grid grid-cols-6 gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((number) => (
                <button
                  key={number}
                  type="button"
                  disabled={locked}
                  onClick={() => {
                    setGuess(number);
                    if (outcome !== "won") {
                      setLastRoll(null);
                      setOutcome("idle");
                    }
                  }}
                  aria-pressed={guess === number}
                  className={cn(
                    "grid h-11 place-items-center rounded-xl border text-sm font-semibold tabular-nums transition disabled:opacity-45",
                    guess === number
                      ? "border-gold/50 bg-gold/15 text-gold shadow-[0_0_0_1px_rgba(216,184,120,0.18)]"
                      : "border-line/70 bg-bg/25 text-muted hover:border-line-strong hover:text-ink",
                  )}
                >
                  {number}
                </button>
              ))}
            </div>
          </div>

          {outcome === "won" ? (
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-green/25 bg-green/[0.07] px-3.5 py-3">
              <Sparkles className="mt-0.5 size-4 shrink-0 text-green" />
              <div>
                <p className="text-[11px] font-semibold text-green">You rolled {lastRoll} — top-up credited</p>
                <p className="mt-0.5 text-[10px] leading-4 text-muted/65">
                  {formatCents(awardedCents)} landed in your wallet. You can come back when you drop below{" "}
                  {formatCents(targetCents)} again.
                </p>
              </div>
            </div>
          ) : outcome === "lost" ? (
            <div className="mt-4 rounded-xl border border-red/25 bg-red/[0.06] px-3.5 py-3">
              <p className="text-[11px] font-semibold text-red/90">You rolled {lastRoll} — no top-up</p>
              <p className="mt-0.5 text-[10px] leading-4 text-muted/65">
                Keep your number or pick another one and roll again. The die owes you nothing.
              </p>
            </div>
          ) : belowTarget ? (
            <p className="mt-4 text-[10px] leading-4 text-muted/50">
              Top-ups are capped at {formatCents(targetCents)}. If your balance is already at or above the cap, the
              challenge stays closed.
            </p>
          ) : (
            <div className="mt-4 rounded-xl border border-line/60 bg-bg/30 px-3.5 py-3 text-[10px] leading-4 text-muted/60">
              Your balance is at the {formatCents(targetCents)} cap, so there is nothing to top up right now.
            </div>
          )}

          <div className="mt-5 flex items-center justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={() => setOpen(false)} disabled={mutation.isPending}>
              Close
            </Button>
            {outcome === "won" ? (
              <Button type="button" size="sm" onClick={() => setOpen(false)}>
                Back to the floor
              </Button>
            ) : (
              <Button
                type="button"
                size="sm"
                onClick={roll}
                disabled={guess === null || locked || !belowTarget}
              >
                <Dices className="size-3.5" />
                {mutation.isPending ? "Rolling…" : "Roll the die"}
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </TopUpContext.Provider>
  );
}

export function useTopUp() {
  const context = useContext(TopUpContext);
  if (!context) throw new Error("useTopUp must be used inside TopUpProvider");
  return context;
}
