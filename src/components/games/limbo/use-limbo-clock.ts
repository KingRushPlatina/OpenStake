"use client";

import { useEffect, useState } from "react";
import { LIMBO_MAX_MULTIPLIER, limboCrashDelayMs, limboMultiplierAtElapsed } from "@/lib/limbo";

const MAX_FLIGHT_MS = limboCrashDelayMs(LIMBO_MAX_MULTIPLIER);

/**
 * Tracks the flight multiplier from the server-anchored clock.
 * Two decoupled instances (scene + cashout panel) keep the page from re-rendering.
 */
export function useLimboClock(
  startedAtMs: number | undefined,
  offsetRef: { current: number },
) {
  const [multiplier, setMultiplier] = useState(1);

  useEffect(() => {
    if (!startedAtMs) return;
    let frame = 0;
    let lastCommit = 0;

    const tick = (time: number) => {
      const elapsed = Math.max(0, Date.now() + offsetRef.current - startedAtMs);
      // A round cannot stay airborne past the 1,000,000x ceiling; a stale bet is
      // waiting for the status poll to settle it, so do not flash a huge value.
      const next = elapsed > MAX_FLIGHT_MS ? 1 : limboMultiplierAtElapsed(elapsed);
      // The published multiplier moves in 0.01 steps, so ~30fps is plenty.
      if (time - lastCommit >= 33) {
        lastCommit = time;
        setMultiplier(next);
      }
      frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [offsetRef, startedAtMs]);

  return multiplier;
}
