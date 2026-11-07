import { NextResponse } from "next/server";
import { getContainer } from "@/platform/container";
import { readJson, requireUserId } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

type Body = {
  amountCents?: unknown;
  input?: unknown;
  idempotencyKey?: unknown;
};

export async function POST(request: Request, context: { params: Promise<{ game: string }> }) {
  try {
    const userId = await requireUserId();
    const { game } = await context.params;
    const body = (await readJson(request)) as Body;
    const result = await getContainer().betting.playInstant(
      userId,
      game,
      Number(body.amountCents ?? 0),
      body.input ?? {},
      String(body.idempotencyKey ?? ""),
    );
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
