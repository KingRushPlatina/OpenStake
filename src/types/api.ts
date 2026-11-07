export type SessionPayload = {
  user: {
    id: string;
    name: string;
    createdAt: string;
  };
  wallet: {
    balanceCents: number;
  };
  stats: {
    totalBets: number;
    wageredCents: number;
    payoutCents: number;
    netProfitCents: number;
    biggestWinCents: number;
    biggestMultiplier: number;
  };
  faucet: {
    available: boolean;
    amountCents: number;
    targetCents: number;
  };
  seed: {
    serverSeedHash: string;
    clientSeed: string;
    nonce: number;
  } | null;
  serverTime: string;
};

export type LiveBet = {
  type: "live-bet";
  id: string;
  userId: string;
  name: string;
  gameId: string;
  gameName: string;
  amountCents: number;
  multiplier: number;
  payoutCents: number;
  win: boolean;
  createdAt: string;
};

export type LeaderboardRow = {
  rank: number;
  userId: string;
  name: string;
  totalBets: number;
  wageredCents: number;
  payoutCents: number;
  netProfitCents: number;
  biggestWinCents: number;
  biggestMultiplier: number;
  isCurrentUser: boolean;
};

export type LeaderboardResponse = {
  metric: "profit" | "biggest-win" | "wagered";
  rows: LeaderboardRow[];
  currentRank: number | null;
};

export type TransactionRow = {
  id: string;
  userId: string;
  type: string;
  amountCents: number;
  balanceAfterCents: number;
  betId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};
