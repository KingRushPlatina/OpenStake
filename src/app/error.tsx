"use client";

import { RefreshCw } from "lucide-react";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="surface max-w-md p-8 text-center">
        <p className="font-display text-xl font-bold">The dealer hit a snag</p>
        <p className="mt-2 text-xs leading-5 text-muted">Something unexpected happened while loading this table. Your balance and bets are safe.</p>
        <button type="button" onClick={reset} className="btn btn-primary mt-6 w-full">
          <RefreshCw className="size-4" /> Try again
        </button>
      </div>
    </div>
  );
}
