import { createHash } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDatabase } from "@/platform/db/client";
import { users } from "@/platform/db/schema";

export const dynamic = "force-dynamic";

const pattern = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/;

export async function GET(request: Request, context: { params: Promise<{ userId: string }> }) {
  const { userId } = await context.params;
  const database = await getDatabase();
  const [row] = await database
    .select({ avatarImage: users.avatarImage })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  const match = row?.avatarImage?.match(pattern);
  if (!match) {
    return new Response(null, { status: 404 });
  }
  const etag = `"${createHash("sha1").update(match[2]).digest("hex")}"`;
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag } });
  }
  const bytes = Uint8Array.from(Buffer.from(match[2], "base64"));
  return new Response(bytes, {
    headers: {
      "Content-Type": match[1],
      "Content-Length": String(bytes.byteLength),
      "Cache-Control": "private, no-cache",
      ETag: etag,
    },
  });
}
