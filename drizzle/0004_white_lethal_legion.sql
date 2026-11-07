DELETE FROM "users" WHERE "is_bot" = true;--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "is_bot";
