CREATE TYPE "public"."user_system_role" AS ENUM('guest', 'player', 'dm', 'admin');--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "role" "user_system_role" DEFAULT 'guest';--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "tier";--> statement-breakpoint
DROP TYPE "public"."user_tier";