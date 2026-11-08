import { NextResponse } from "next/server";
import { getContainer } from "@/platform/container";
import { requireUserId } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ game: string; betId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { betId } = await context.params;
    const active = await getContainer().betting.getStatus(userId, betId);
    return NextResponse.json({ active, serverNowMs: Date.now() });
  } catch (error) {
    return errorResponse(error);
  }
}
