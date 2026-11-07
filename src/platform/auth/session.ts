import { cookies } from "next/headers";
import { createHmac } from "node:crypto";
import { env } from "@/platform/env";
import { safeEqual } from "@/lib/fairness";

const COOKIE_NAME = "openstake_session";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

function signature(userId: string) {
  return createHmac("sha256", env.SESSION_SECRET).update(userId).digest("base64url");
}

export function createSessionToken(userId: string) {
  return `${userId}.${signature(userId)}`;
}

export function readSessionToken(token: string | undefined) {
  if (!token) return null;
  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;
  const userId = token.slice(0, separator);
  const providedSignature = token.slice(separator + 1);
  const expectedSignature = signature(userId);
  if (!safeEqual(providedSignature, expectedSignature)) return null;
  return userId;
}

export async function getSessionUserId() {
  const store = await cookies();
  return readSessionToken(store.get(COOKIE_NAME)?.value);
}

export async function setSessionCookie(userId: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, createSessionToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: env.NODE_ENV === "production",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
  });
}

export const sessionCookieName = COOKIE_NAME;
