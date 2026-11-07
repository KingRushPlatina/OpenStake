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
      apiFetch<{ amountCents: number; balanceCents: number; targetCents: number }>("/api/faucet", {
        method: "POST",
      }),
    onSuccess: (result) => {
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
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      toast.success("Balance topped up", {
        description: `${formatCents(result.amountCents)} added. You are back at ${formatCents(result.targetCents)}.`,
      });
    },
    onError: (error) => toast.error("Top-up unavailable", { description: error.message }),
  });
}
