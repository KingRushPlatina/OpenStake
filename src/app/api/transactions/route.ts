import { NextResponse } from "next/server";
import { getContainer } from "@/platform/container";
import { requireUserId } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(request.url);
    const limit = Number(url.searchParams.get("limit") ?? 50);
    const transactions = await getContainer().leaderboard.getTransactions(userId, limit);
    return NextResponse.json({ transactions });
  } catch (error) {
    return errorResponse(error);
  }
}
