import { NextResponse } from "next/server";
import { getContainer } from "@/platform/container";
import { getSessionUserId, setSessionCookie } from "@/platform/auth/session";
import { errorResponse } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const container = getContainer();
    let userId = await getSessionUserId();
    let session = null;
    if (userId) {
      const user = await container.users.getById(userId);
      if (user) session = await container.users.getSession(userId);
    }
    if (!session) {
      session = await container.users.createGuest();
      userId = session.user.id;
      await setSessionCookie(userId);
    }
    return NextResponse.json({ ...session, serverTime: new Date().toISOString() });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST() {
  return GET();
}
