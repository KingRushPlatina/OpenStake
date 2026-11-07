import { NextResponse } from "next/server";
import { getContainer } from "@/platform/container";
import { readJson, requireUserId } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  context: { params: Promise<{ game: string; betId: string }> },
) {
  try {
    const userId = await requireUserId();
    const { betId } = await context.params;
    const body = (await readJson(request)) as { actionKey?: unknown };
    const result = await getContainer().betting.cashout(userId, betId, String(body.actionKey ?? ""));
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
