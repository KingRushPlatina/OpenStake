import { NextResponse } from "next/server";
import { getContainer } from "@/platform/container";
import { requireUserId, readJson } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = (await readJson(request)) as {
      name?: unknown;
      avatarPreset?: unknown;
      avatarImage?: unknown;
    };
    const session = await getContainer().users.completeOnboarding(userId, {
      name: body.name,
      avatarPreset: body.avatarPreset,
      avatarImage: body.avatarImage,
    });
    return NextResponse.json(session);
  } catch (error) {
    return errorResponse(error);
  }
}
