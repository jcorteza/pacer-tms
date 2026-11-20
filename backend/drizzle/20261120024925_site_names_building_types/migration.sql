-- New required columns are added nullable, backfilled for any existing rows, then made NOT NULL.
ALTER TABLE "warehouse_codes" ADD COLUMN "name" text;--> statement-breakpoint
UPDATE "warehouse_codes" SET "name" = "code";--> statement-breakpoint
ALTER TABLE "warehouse_codes" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "building_codes" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "building_codes" ADD COLUMN "type" text;--> statement-breakpoint
UPDATE "building_codes" SET "name" = "code", "type" = 'storage';--> statement-breakpoint
ALTER TABLE "building_codes" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "building_codes" ALTER COLUMN "type" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "building_codes" ALTER COLUMN "building" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "building_codes" ADD CONSTRAINT "building_codes_type" CHECK ("type" in ('storage', 'transport'));
