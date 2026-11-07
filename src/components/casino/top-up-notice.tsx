"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { useSession } from "@/components/session-provider";
import { Button } from "@/components/ui/button";
import { formatCents } from "@/lib/money";
import { useFaucetClaim } from "./use-faucet-claim";

export function TopUpNotice({ minBetCents }: { minBetCents: number }) {
  const { session } = useSession();
  const claim = useFaucetClaim();
  const belowTarget = session.wallet.balanceCents < session.faucet.targetCents;
  const blocked = session.wallet.balanceCents < minBetCents;

  if (!blocked) return null;

  const refillCents = session.faucet.amountCents || session.faucet.targetCents;

  return (
    <div className="flex flex-col items-start justify-between gap-4 rounded-2xl border border-red/25 bg-red/[0.06] px-4 py-4 sm:flex-row sm:items-center sm:px-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full border border-red/25 bg-red/10 text-red">
          <AlertTriangle className="size-4" />
        </span>
        <div>
          <p className="text-[12px] font-semibold text-ink">You are out of credits</p>
          <p className="mt-0.5 text-[10px] leading-5 text-muted/70">
            Your balance is below the {formatCents(minBetCents)} minimum stake. Reload to{" "}
            {formatCents(session.faucet.targetCents)} and keep playing.
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        onClick={() => claim.mutate()}
        disabled={!belowTarget || claim.isPending}
        className="shrink-0"
      >
        <Plus className="size-3.5" />
        {claim.isPending ? "Reloading…" : `Reload ${formatCents(refillCents)}`}
      </Button>
    </div>
  );
}
