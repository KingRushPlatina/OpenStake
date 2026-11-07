import { NextResponse } from "next/server";
import { getCrashService } from "@/modules/crash/crash-service";
import { requireUserId } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const userId = await requireUserId();
    const result = await getCrashService().cashout(userId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
