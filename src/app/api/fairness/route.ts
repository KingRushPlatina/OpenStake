import { NextResponse } from "next/server";
import { getContainer } from "@/platform/container";
import { readJson, requireUserId } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const userId = await requireUserId();
    const overview = await getContainer().seeds.getOverview(userId);
    return NextResponse.json(overview);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST() {
  try {
    const userId = await requireUserId();
    const result = await getContainer().seeds.rotate(userId);
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const userId = await requireUserId();
    const body = (await readJson(request)) as { clientSeed?: unknown };
    const clientSeed = String(body.clientSeed ?? "").trim();
    if (clientSeed.length < 1 || clientSeed.length > 64) {
      return NextResponse.json(
        { error: { code: "INVALID_INPUT", message: "Client seed must be 1-64 characters" } },
        { status: 400 },
      );
    }
    const seed = await getContainer().seeds.setClientSeed(userId, clientSeed);
    return NextResponse.json({ seed });
  } catch (error) {
    return errorResponse(error);
  }
}
