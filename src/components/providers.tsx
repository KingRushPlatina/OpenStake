"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";
import { SessionProvider } from "@/components/session-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 15_000,
            refetchOnWindowFocus: false,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={client}>
      <SessionProvider>{children}</SessionProvider>
      <Toaster
        position="top-right"
        theme="dark"
        offset={84}
        toastOptions={{
          classNames: {
            toast: "!rounded-xl !border !border-line !bg-surface !text-ink !shadow-[0_18px_50px_rgba(0,0,0,0.5)]",
            title: "!text-[12px] !font-semibold !text-ink",
            description: "!text-[11px] !leading-5 !text-muted",
            success: "!border-green/25",
            error: "!border-red/25",
            actionButton: "!bg-gold !text-[#14100a]",
            cancelButton: "!bg-surface-2 !text-muted",
          },
        }}
      />
    </QueryClientProvider>
  );
}
