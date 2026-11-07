import { NextResponse } from "next/server";
import { getCrashService } from "@/modules/crash/crash-service";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const service = getCrashService();
    await service.ensureStarted();
    return NextResponse.json(service.snapshot());
  } catch (error) {
    return errorResponse(error);
  }
}
