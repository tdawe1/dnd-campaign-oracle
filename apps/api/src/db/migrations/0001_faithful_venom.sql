CREATE INDEX IF NOT EXISTS "idx_campaign_members_campaign" ON "campaign_members" ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_campaign_members_user" ON "campaign_members" ("user_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_characters_campaign" ON "characters" ("campaign_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_characters_owner" ON "characters" ("owner_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "idx_quests_campaign" ON "quests" ("campaign_id");