import { NextResponse } from "next/server";
import { getContainer } from "@/platform/container";
import { getSessionUserId } from "@/platform/auth/session";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const metric = url.searchParams.get("metric");
    const normalized = metric === "biggest-win" || metric === "wagered" ? metric : "profit";
    const userId = await getSessionUserId();
    const leaderboard = await getContainer().leaderboard.getLeaderboard(normalized, userId ?? undefined);
    return NextResponse.json(leaderboard);
  } catch (error) {
    return errorResponse(error);
  }
}
