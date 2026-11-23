-- Anonymous sessions (no user) were never accepted by the session guard, so they are dropped before user_id becomes required.
DELETE FROM "sessions" WHERE "user_id" IS NULL;--> statement-breakpoint
ALTER TABLE "sessions" ADD COLUMN "is_demo_user" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET NOT NULL;
