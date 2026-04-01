CREATE TABLE "transcript_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"session_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"content" text NOT NULL,
	"ai_instructions" text,
	"is_active" boolean DEFAULT false NOT NULL,
	"is_ai_generated" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "session_logs" ADD COLUMN "tldr" text;--> statement-breakpoint
ALTER TABLE "session_logs" ADD COLUMN "key_interactions" jsonb;--> statement-breakpoint
ALTER TABLE "session_logs" ADD COLUMN "decisions" jsonb;--> statement-breakpoint
ALTER TABLE "session_logs" ADD COLUMN "plans" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "invite_code" text;--> statement-breakpoint
ALTER TABLE "transcript_versions" ADD CONSTRAINT "transcript_versions_session_id_session_logs_id_fk" FOREIGN KEY ("session_id") REFERENCES "public"."session_logs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transcript_versions" ADD CONSTRAINT "transcript_versions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_transcript_versions_session" ON "transcript_versions" USING btree ("session_id");--> statement-breakpoint
CREATE INDEX "idx_transcript_versions_user" ON "transcript_versions" USING btree ("user_id");