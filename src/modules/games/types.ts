import type { z } from "zod";
import type { FairRandom } from "@/lib/fairness";

export type GameId =
  | "blackjack"
  | "dice"
  | "limbo"
  | "plinko"
  | "mines"
  | "keno"
  | "wheel"
  | "hilo"
  | "dragon-tower"
  | "chicken-cross";

export type GameCategory = "originals";

export type GameKind = "instant" | "stateful";

export type GameAccent = "blue" | "purple" | "pink" | "green" | "amber" | "red" | "cyan" | "orange";

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

export type EngineOutcome = {
  multiplier: number;
  result: Record<string, unknown>;
};

export type InstantGameDefinition = {
  metadata: GameMetadata;
  inputSchema: z.ZodType;
  resolveAmount?: (input: unknown) => number;
  play: (input: unknown, random: RandomSource) => EngineOutcome;
};

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
