export const CENTS_IN_DOLLAR = 100;

export function formatCents(cents: number, options?: { compact?: boolean }) {
  const value = cents / CENTS_IN_DOLLAR;
  if (options?.compact && Math.abs(value) >= 1000) {
    return value.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      notation: "compact",
      maximumFractionDigits: 1,
    });
  }
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function formatMultiplier(multiplier: number) {
  if (multiplier >= 1000) return `${multiplier.toFixed(0)}x`;
  if (multiplier >= 100) return `${multiplier.toFixed(1)}x`;
  return `${multiplier.toFixed(2)}x`;
}

export function formatSignedCents(cents: number) {
  const prefix = cents > 0 ? "+" : "";
  return `${prefix}${formatCents(cents)}`;
}

export function parseAmountToCents(value: string) {
  const parsed = Number.parseFloat(value.replace(/,/g, ""));
  if (!Number.isFinite(parsed)) return 0;
  return Math.round(parsed * CENTS_IN_DOLLAR);
}

export function toCents(value: number) {
  return Math.round(value * CENTS_IN_DOLLAR);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function payoutFor(betCents: number, multiplier: number) {
  return Math.floor(betCents * multiplier);
}
