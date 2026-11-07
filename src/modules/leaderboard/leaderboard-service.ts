import { and, desc, eq, gt, sql } from "drizzle-orm";
import { getDatabase } from "@/platform/db/client";
import { ledgerEntries, playerStats, users } from "@/platform/db/schema";
import type { UserService } from "@/modules/identity/user-service";
import { env } from "@/platform/env";

export type LeaderboardMetric = "profit" | "biggest-win" | "wagered";

export class LeaderboardService {
  constructor(private readonly users: UserService) {}

  async getLeaderboard(metric: LeaderboardMetric, currentUserId?: string) {
    await this.users.ensureDemoBots();
    const database = await getDatabase();
    const metricColumn =
      metric === "biggest-win"
        ? playerStats.biggestWinCents
        : metric === "wagered"
          ? playerStats.wageredCents
          : playerStats.netProfitCents;
    const baseQuery = database
      .select({
        userId: users.id,
        name: users.name,
        isBot: users.isBot,
        totalBets: playerStats.totalBets,
        wageredCents: playerStats.wageredCents,
        payoutCents: playerStats.payoutCents,
        netProfitCents: playerStats.netProfitCents,
        biggestWinCents: playerStats.biggestWinCents,
        biggestMultiplier: playerStats.biggestMultiplier,
      })
      .from(playerStats)
      .innerJoin(users, eq(users.id, playerStats.userId));
    const rows = await (env.DEMO_LIQUIDITY ? baseQuery : baseQuery.where(eq(users.isBot, false)))
      .orderBy(desc(metricColumn))
      .limit(50);

    let currentRank: number | null = null;
    if (currentUserId) {
      const [current] = await database
        .select({
          netProfitCents: playerStats.netProfitCents,
          biggestWinCents: playerStats.biggestWinCents,
          wageredCents: playerStats.wageredCents,
        })
        .from(playerStats)
        .where(eq(playerStats.userId, currentUserId))
        .limit(1);
      if (current) {
        const currentValue =
          metric === "biggest-win"
            ? current.biggestWinCents
            : metric === "wagered"
              ? current.wageredCents
              : current.netProfitCents;
        const [higher] = await database
          .select({ count: sql<number>`count(*)::int` })
          .from(playerStats)
          .where(env.DEMO_LIQUIDITY ? gt(metricColumn, currentValue) : and(gt(metricColumn, currentValue), eq(users.isBot, false)));
        currentRank = (higher?.count ?? 0) + 1;
      }
    }

    return {
      metric,
      rows: rows.map((row, index) => ({
        rank: index + 1,
        userId: row.userId,
        name: row.name,
        isBot: row.isBot,
        totalBets: row.totalBets,
        wageredCents: row.wageredCents,
        payoutCents: row.payoutCents,
        netProfitCents: row.netProfitCents,
        biggestWinCents: row.biggestWinCents,
        biggestMultiplier: row.biggestMultiplier,
        isCurrentUser: row.userId === currentUserId,
      })),
      currentRank,
    };
  }

  async getTransactions(userId: string, limit = 50) {
    const database = await getDatabase();
    return database
      .select()
      .from(ledgerEntries)
      .where(eq(ledgerEntries.userId, userId))
      .orderBy(desc(ledgerEntries.createdAt))
      .limit(Math.min(Math.max(limit, 1), 100));
  }
}
