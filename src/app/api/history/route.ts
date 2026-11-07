import { NextResponse } from "next/server";
import { getContainer } from "@/platform/container";
import { requireUserId } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const userId = await requireUserId();
    const url = new URL(request.url);
    const game = url.searchParams.get("game") ?? undefined;
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const history = await getContainer().betting.getHistory(userId, game, limit);
    return NextResponse.json({ history });
  } catch (error) {
    return errorResponse(error);
  }
}
