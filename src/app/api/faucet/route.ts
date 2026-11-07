import { NextResponse } from "next/server";
import { getContainer } from "@/platform/container";
import { readJson, requireUserId } from "@/platform/auth/require-user";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const userId = await requireUserId();
    const body = (await readJson(request)) as { guess?: unknown };
    const result = await getContainer().faucet.claim(userId, Number(body.guess));
    return NextResponse.json(result);
  } catch (error) {
    return errorResponse(error);
  }
}
