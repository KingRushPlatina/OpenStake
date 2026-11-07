import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDatabase } from "@/platform/db/client";
import { bets } from "@/platform/db/schema";
import { requireUserId } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(request.url);
    const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 8), 1), 20);
    const database = await getDatabase();
    const rows = await database
      .select({
        id: bets.id,
        gameId: bets.gameId,
        status: bets.status,
        payoutCents: bets.payoutCents,
        createdAt: bets.createdAt,
      })
      .from(bets)
      .where(eq(bets.userId, userId))
      .orderBy(desc(bets.createdAt))
      .limit(limit);
    return NextResponse.json({ bets: rows });
  } catch (error) {
    return errorResponse(error);
  }
}
