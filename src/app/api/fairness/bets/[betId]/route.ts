import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDatabase } from "@/platform/db/client";
import { bets, seedPairs } from "@/platform/db/schema";
import { requireUserId } from "@/platform/auth/require-user";
import { AppError, errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ betId: string }> }) {
  try {
    const userId = await requireUserId();
    const { betId } = await context.params;
    const database = await getDatabase();
    const [row] = await database
      .select({ bet: bets, seed: seedPairs })
      .from(bets)
      .leftJoin(seedPairs, eq(bets.seedPairId, seedPairs.id))
      .where(and(eq(bets.id, betId), eq(bets.userId, userId)))
      .limit(1);
    if (!row) throw new AppError("NOT_FOUND", "Bet not found", 404);
    const seed = row.seed;
    if (!seed || seed.active || !seed.revealedServerSeed) {
      return NextResponse.json({
        revealed: false,
        gameId: row.bet.gameId,
        serverSeedHash: seed?.serverSeedHash ?? null,
        clientSeed: row.bet.clientSeedSnapshot ?? seed?.clientSeed ?? null,
        nonce: row.bet.nonce,
        message: "Rotate this seed pair to reveal the server seed for verification.",
      });
    }
    return NextResponse.json({
      revealed: true,
      betId: row.bet.id,
      gameId: row.bet.gameId,
      status: row.bet.status,
      serverSeedHash: seed.serverSeedHash,
      serverSeed: seed.revealedServerSeed,
      clientSeed: row.bet.clientSeedSnapshot ?? seed.clientSeed,
      nonce: row.bet.nonce,
      gameInput: row.bet.gameInput,
      result: row.bet.result,
      payoutCents: row.bet.payoutCents,
      createdAt: row.bet.createdAt,
      formula: "HMAC-SHA256(serverSeed, clientSeed:nonce:cursor) -> 4-byte big-endian floats",
    });
  } catch (error) {
    return errorResponse(error);
  }
}
