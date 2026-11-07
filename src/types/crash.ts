export type CrashPhase = "betting" | "running" | "crashed";

export type CrashPlayer = {
  userId: string;
  name: string;
  amountCents: number;
  autoCashout: number | null;
  status: "active" | "cashed" | "lost";
  cashoutMultiplier: number | null;
  payoutCents: number;
  isBot: boolean;
};

export type CrashSnapshot = {
  phase: CrashPhase;
  roundId: string;
  roundNumber: number;
  serverSeedHash: string;
  serverSeed: string | null;
  crashPoint: number | null;
  multiplier: number;
  elapsedMs: number;
  phaseEndsAt: string | null;
  players: CrashPlayer[];
  history: { roundNumber: number; crashPoint: number }[];
};
