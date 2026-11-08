import { NextResponse } from "next/server";
import { getContainer } from "@/platform/container";
import { requireUserId } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ game: string }> }) {
  try {
    const userId = await requireUserId();
    const { game } = await context.params;
    const active = await getContainer().betting.getActiveBet(userId, game);
    return NextResponse.json({ active, serverNowMs: Date.now() });
  } catch (error) {
    return errorResponse(error);
  }
}
