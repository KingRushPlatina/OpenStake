import { AppError } from "@/lib/errors";
import { getSessionUserId } from "@/platform/auth/session";
import { getContainer } from "@/platform/container";

export async function requireUserId() {
  const userId = await getSessionUserId();
  if (!userId) throw new AppError("UNAUTHORIZED", "Start a guest session first", 401);
  const user = await getContainer().users.getById(userId);
  if (!user) throw new AppError("UNAUTHORIZED", "Guest session not found", 401);
  return userId;
}

export async function readJson(request: Request) {
  try {
    return (await request.json()) as unknown;
  } catch {
    throw new AppError("INVALID_INPUT", "Invalid JSON body", 400);
  }
}
