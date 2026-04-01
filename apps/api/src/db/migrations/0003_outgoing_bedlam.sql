DO $$ BEGIN
 CREATE TYPE "public"."item_category" AS ENUM('weapon', 'armor', 'consumable', 'wondrous', 'treasure', 'misc');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."item_rarity" AS ENUM('common', 'uncommon', 'rare', 'very_rare', 'legendary', 'artifact');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"campaign_id" uuid NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" "item_category" DEFAULT 'misc',
	"rarity" "item_rarity" DEFAULT 'common',
	"quantity" integer DEFAULT 1 NOT NULL,
	"character_id" uuid,
	"is_equipped" boolean DEFAULT false,
	"notes" text,
	"image_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "accounts" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "campaign_members" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "campaigns" ALTER COLUMN "dm_user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "characters" ALTER COLUMN "owner_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "notifications" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "sessions" ALTER COLUMN "user_id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "id" SET DATA TYPE text;--> statement-breakpoint
ALTER TABLE "verifications" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "subclass" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "race" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "subrace" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "background" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "alignment" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "temp_hp" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "initiative" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "speed" integer DEFAULT 30;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "proficiency_bonus" integer DEFAULT 2;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "hit_dice" text;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "strength" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "dexterity" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "constitution" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "intelligence" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "wisdom" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "charisma" integer DEFAULT 10;--> statement-breakpoint
ALTER TABLE "characters" ADD COLUMN "extended_data" jsonb;--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "items" ADD CONSTRAINT "items_campaign_id_campaigns_id_fk" FOREIGN KEY ("campaign_id") REFERENCES "public"."campaigns"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "items" ADD CONSTRAINT "items_character_id_characters_id_fk" FOREIGN KEY ("character_id") REFERENCES "public"."characters"("id") ON DELETE set null ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_items_campaign" ON "items" ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_items_character" ON "items" ("character_id");