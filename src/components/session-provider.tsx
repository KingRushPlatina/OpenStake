"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import type { SessionPayload } from "@/types/api";

type SessionContextValue = {
  session: SessionPayload;
  setBalance: (balanceCents: number) => void;
  refresh: () => Promise<unknown>;
  updateSession: (updater: (current: SessionPayload) => SessionPayload) => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["session"],
    queryFn: () => apiFetch<SessionPayload>("/api/session"),
    staleTime: 30_000,
    retry: 2,
  });

  const setBalance = useCallback(
    (balanceCents: number) => {
      queryClient.setQueryData<SessionPayload>(["session"], (current) =>
        current ? { ...current, wallet: { balanceCents } } : current,
      );
    },
    [queryClient],
  );

  const updateSession = useCallback(
    (updater: (current: SessionPayload) => SessionPayload) => {
      queryClient.setQueryData<SessionPayload>(["session"], (current) => (current ? updater(current) : current));
    },
    [queryClient],
  );

  const refresh = useCallback(() => queryClient.invalidateQueries({ queryKey: ["session"] }), [queryClient]);

  const value = useMemo<SessionContextValue | null>(
    () => (query.data ? { session: query.data, setBalance, refresh, updateSession } : null),
    [query.data, refresh, setBalance, updateSession],
  );

  if (query.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="flex flex-col items-center gap-6">
          <div className="relative grid size-16 place-items-center rounded-2xl border border-gold/30 bg-surface font-display text-3xl text-gold">
            O
            <span className="absolute inset-0 animate-ping rounded-2xl border border-gold/20" />
          </div>
          <div className="text-center">
            <p className="font-display text-xl text-ink">OpenStake</p>
            <p className="mt-1.5 text-[10px] uppercase tracking-[0.2em] text-muted/50">Preparing your seat</p>
          </div>
        </div>
      </div>
    );
  }

  if (query.isError || !value) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="surface w-full max-w-md p-8 text-center">
          <p className="font-display text-2xl text-ink">Could not open the table</p>
          <p className="mt-2 text-[11px] leading-5 text-muted">Check the database connection and try again.</p>
          <Button type="button" className="mt-6 w-full" onClick={() => query.refetch()}>
            Try again
          </Button>
        </div>
      </div>
    );
  }

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used inside SessionProvider");
  return context;
}
