import type { FairRandom } from "@/lib/fairness";

export type GameId = "blackjack";

export type GameCategory = "originals";

export type GameKind = "stateful";

export type GameAccent = "green";

export type GameMetadata = {
  id: GameId;
  name: string;
  category: GameCategory;
  kind: GameKind;
  tagline: string;
  description: string;
  accent: GameAccent;
  icon: string;
  rtp: string;
  minBetCents: number;
  maxBetCents: number;
  maxWinMultiplier: number;
  available: boolean;
};

export type RandomSource = Pick<FairRandom, "next" | "int" | "pick" | "shuffle">;

export type PublicBet = {
  id: string;
  gameId: GameId;
  amountCents: number;
  payoutCents: number;
  profitCents: number;
  multiplier: number;
  status: string;
  result: Record<string, unknown>;
  createdAt: string;
  seed: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  } | null;
  balanceCents?: number;
};
