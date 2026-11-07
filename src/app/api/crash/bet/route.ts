import { NextResponse } from "next/server";
import { getCrashService } from "@/modules/crash/crash-service";
import { readJson, requireUserId } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = (await readJson(request)) as { amountCents?: unknown; autoCashout?: unknown };
    const autoCashout =
      body.autoCashout === null || body.autoCashout === undefined || body.autoCashout === ""
        ? null
        : Number(body.autoCashout);
    const result = await getCrashService().placeBet(userId, Number(body.amountCents ?? 0), autoCashout);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
