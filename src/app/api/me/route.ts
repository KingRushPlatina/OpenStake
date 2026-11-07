import { NextResponse } from "next/server";
import { getContainer } from "@/platform/container";
import { requireUserId, readJson } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireUserId();
    const session = await getContainer().users.getSession(userId);
    return NextResponse.json(session);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const body = (await readJson(request)) as { name?: unknown };
    const session = await getContainer().users.rename(userId, String(body.name ?? ""));
    return NextResponse.json(session);
  } catch (error) {
    return errorResponse(error);
  }
}
