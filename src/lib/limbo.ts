/** The multiplier doubles every 8 seconds of flight. */
export const LIMBO_GROWTH_MS = 8_000;
export const LIMBO_MAX_MULTIPLIER = 1_000_000;

/** Crash points follow 99 / (1 - r), the same 99% RTP curve as a crash game. */
export function limboCrashFromRandom(value: number) {
  const safe = Math.min(0.999_999, Math.max(0, value));
  const raw = 0.99 / (1 - safe);
  return Math.min(LIMBO_MAX_MULTIPLIER, Math.max(1, Math.floor(raw * 100) / 100));
}

/** Server-side multiplier for a given flight time, rounded down to cents. */
export function limboMultiplierAtElapsed(elapsedMs: number) {
  const elapsed = Math.max(0, elapsedMs);
  const raw = 2 ** (elapsed / LIMBO_GROWTH_MS);
  return Math.min(LIMBO_MAX_MULTIPLIER, Math.max(1, Math.floor(raw * 100) / 100));
}

/** Milliseconds until the plane reaches the crash point. */
export function limboCrashDelayMs(crash: number) {
  if (!Number.isFinite(crash) || crash <= 1) return 0;
  return Math.ceil(Math.log2(crash) * LIMBO_GROWTH_MS);
}

/** Normalised (0..1) position along the flight curve for a multiplier. */
export function limboFlightAt(progress: number) {
  const u = Math.min(0.999, Math.max(0, progress));
  return { x: u, y: u ** 0.82, u };
}

export function limboFlightPoint(multiplier: number) {
  return limboFlightAt(1 - 1 / Math.max(1.000_1, multiplier));
}
