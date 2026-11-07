"use client";

import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-6">
      <div className="surface w-full max-w-md p-8 text-center">
        <p className="font-display text-2xl text-ink">The dealer hit a snag</p>
        <p className="mt-2 text-[11px] leading-5 text-muted">Something unexpected happened while loading the table. Your balance and hands are safe.</p>
        <Button type="button" onClick={reset} className="mt-6 w-full">
          <RefreshCw className="size-4" /> Try again
        </Button>
      </div>
    </div>
  );
}
