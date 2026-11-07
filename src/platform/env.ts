import { z } from "zod";

const envSchema = z.object({
  SESSION_SECRET: z.string().min(16),
  SEED_ENCRYPTION_KEY: z.string().min(16),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

export const env = envSchema.parse({
  SESSION_SECRET: process.env.SESSION_SECRET ?? "development-session-secret-change-me",
  SEED_ENCRYPTION_KEY: process.env.SEED_ENCRYPTION_KEY ?? "ZGV2ZWxvcG1lbnQtc2VlZC1rZXktMzJieXRlcy0hIQ==",
  NODE_ENV: process.env.NODE_ENV,
});
