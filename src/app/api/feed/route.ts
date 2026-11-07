import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/platform/db/client";
import { bets, users } from "@/platform/db/schema";
import { getGameMetadata } from "@/modules/games/catalog";
import type { LiveBet } from "@/types/api";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const requested = Number(url.searchParams.get("limit") ?? 20);
    const limit = Math.min(Math.max(Number.isFinite(requested) ? requested : 20, 1), 50);
    const database = await getDatabase();
    const rows = await database
      .select({
        id: bets.id,
        userId: bets.userId,
        name: users.name,
        gameId: bets.gameId,
        amountCents: bets.amountCents,
        payoutCents: bets.payoutCents,
        multiplier: bets.multiplier,
        settledAt: bets.settledAt,
        createdAt: bets.createdAt,
      })
      .from(bets)
      .innerJoin(users, eq(users.id, bets.userId))
      .where(eq(bets.status, "settled"))
      .orderBy(desc(bets.settledAt), desc(bets.createdAt))
      .limit(limit);

    const feed: LiveBet[] = rows.map((row) => ({
      type: "live-bet",
      id: row.id,
      userId: row.userId,
      name: row.name,
      gameId: row.gameId,
      gameName: getGameMetadata(row.gameId)?.name ?? row.gameId,
      amountCents: row.amountCents,
      multiplier: row.multiplier,
      payoutCents: row.payoutCents,
      win: row.payoutCents > row.amountCents,
      createdAt: (row.settledAt ?? row.createdAt).toISOString(),
    }));

    return NextResponse.json({ bets: feed });
  } catch (error) {
    return errorResponse(error);
  }
}
