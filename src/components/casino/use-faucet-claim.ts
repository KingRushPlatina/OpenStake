"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useSession } from "@/components/session-provider";
import { apiFetch } from "@/lib/api-client";
import { formatCents } from "@/lib/money";

export function useFaucetClaim() {
  const { setBalance, updateSession } = useSession();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiFetch<{ amountCents: number; balanceCents: number; nextClaimAt: string }>("/api/faucet", {
        method: "POST",
      }),
    onSuccess: (result) => {
      setBalance(result.balanceCents);
      updateSession((current) => ({
        ...current,
        faucet: { ...current.faucet, available: false, amountCents: 0, nextClaimAt: result.nextClaimAt },
      }));
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Faucet claimed", { description: `${formatCents(result.amountCents)} added to your balance.` });
    },
    onError: (error) => toast.error("Faucet unavailable", { description: error.message }),
  });
}
