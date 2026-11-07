"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-client";
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
      <div className="flex min-h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-5">
          <div className="relative flex size-16 items-center justify-center rounded-2xl bg-green text-2xl font-black text-[#071a0a] shadow-[0_0_50px_rgba(0,231,1,0.25)]">
            O
            <span className="absolute inset-0 animate-ping rounded-2xl border border-green/40" />
          </div>
          <div className="text-center">
            <p className="font-display text-lg font-bold tracking-tight">OpenStake</p>
            <p className="mt-1 text-xs text-muted">Preparing your guest wallet…</p>
          </div>
        </div>
      </div>
    );
  }

  if (query.isError || !value) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="surface max-w-md p-8 text-center">
          <p className="font-display text-xl font-bold">Could not start a guest session</p>
          <p className="mt-2 text-sm text-muted">Check the database connection and try again.</p>
          <button type="button" className="btn btn-primary mt-6 w-full" onClick={() => query.refetch()}>
            Try again
          </button>
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
