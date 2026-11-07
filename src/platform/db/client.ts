import { PGlite } from "@electric-sql/pglite";
import { drizzle, type PgliteDatabase } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { mkdirSync } from "node:fs";
import * as schema from "./schema";

export type Database = PgliteDatabase<typeof schema>;

type DatabaseCache = {
  database?: Promise<Database>;
};

const databaseCache = globalThis as typeof globalThis & { openStakeDatabase?: DatabaseCache };

databaseCache.openStakeDatabase ??= {};

async function createDatabase() {
  const dataDirectory = path.join(process.cwd(), ".data", "pglite");
  mkdirSync(path.dirname(dataDirectory), { recursive: true });
  const client = new PGlite(dataDirectory);
  const database = drizzle(client, { schema });
  await migrate(database, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return database;
}

export function getDatabase() {
  databaseCache.openStakeDatabase!.database ??= createDatabase();
  return databaseCache.openStakeDatabase!.database;
}

export async function withTransaction<T>(callback: (database: Database) => Promise<T>) {
  const database = await getDatabase();
  return database.transaction(async (transaction) => callback(transaction as unknown as Database));
}
