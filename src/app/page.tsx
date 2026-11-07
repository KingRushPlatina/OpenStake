import { Suspense } from "react";
import { LobbyClient } from "@/components/casino/lobby-client";

export default function HomePage() {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-2xl bg-surface" />}>
      <LobbyClient />
    </Suspense>
  );
}
