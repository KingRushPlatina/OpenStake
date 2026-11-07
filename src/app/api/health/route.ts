import { NextResponse } from "next/server";
import { getDatabase } from "@/platform/db/client";
import { users } from "@/platform/db/schema";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const database = await getDatabase();
    await database.select({ count: sql<number>`count(*)::int` }).from(users);
    return NextResponse.json({ status: "ok", database: "ready" });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ status: "error", database: "unavailable" }, { status: 503 });
  }
}
