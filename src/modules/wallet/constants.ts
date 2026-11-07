/** Every new seat starts with $100.00 in play money. */
export const STARTING_BALANCE_CENTS = 10_000;
/** Top-ups only ever fill the wallet back up to $100.00. */
export const FAUCET_TARGET_CENTS = 10_000;

export type LedgerType = "welcome" | "faucet" | "bet" | "payout" | "refund";

export type Clock = {
  now: () => Date;
};

export type IdGenerator = {
  create: (prefix: string) => string;
};

export const systemClock: Clock = {
  now: () => new Date(),
};

export const nanoIdGenerator: IdGenerator = {
  create: (prefix: string) => `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 20)}`,
};
