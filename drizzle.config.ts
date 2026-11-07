import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/platform/db/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgresql://openstake:openstake@localhost:5432/openstake",
  },
  verbose: true,
  strict: true,
});
