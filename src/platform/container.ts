import { nanoIdGenerator, systemClock } from "@/modules/wallet/constants";
import { SeedService } from "@/modules/fairness/seed-service";
import { UserService } from "@/modules/identity/user-service";
import { LedgerService } from "@/modules/wallet/ledger-service";
import { BettingService } from "@/modules/betting/betting-service";
import { FaucetService } from "@/modules/wallet/faucet-service";
import { LeaderboardService } from "@/modules/leaderboard/leaderboard-service";

export type Container = ReturnType<typeof createContainer>;

export function createContainer() {
  const ids = nanoIdGenerator;
  const clock = systemClock;
  const seeds = new SeedService(ids);
  const users = new UserService(ids, clock, seeds);
  const ledger = new LedgerService(ids, clock);
  const betting = new BettingService(ids, clock, ledger, seeds);
  const faucet = new FaucetService(ids, clock, ledger);
  const leaderboard = new LeaderboardService();
  return { ids, clock, seeds, users, ledger, betting, faucet, leaderboard };
}

const globalContainer = globalThis as typeof globalThis & { openStakeContainer?: Container };

export function getContainer() {
  globalContainer.openStakeContainer ??= createContainer();
  return globalContainer.openStakeContainer;
}
