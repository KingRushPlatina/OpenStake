"use client";

import { useEffect, useState } from "react";
import type { CrashSnapshot } from "@/types/crash";

export function useCrash() {
  const [snapshot, setSnapshot] = useState<CrashSnapshot | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const source = new EventSource("/api/crash/stream");
    source.onopen = () => setConnected(true);
    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data) as CrashSnapshot | { type: string };
        if ("phase" in payload) setSnapshot(payload);
      } catch {
        return;
      }
    };
    source.onerror = () => setConnected(false);
    return () => source.close();
  }, []);

  return { snapshot, connected };
}
