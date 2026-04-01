CREATE TYPE "public"."user_tier" AS ENUM('free', 'pro', 'enterprise');--> statement-breakpoint
CREATE TABLE "api_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"endpoint" text NOT NULL,
	"method" text NOT NULL,
	"status_code" integer,
	"response_time_ms" integer,
	"tokens_used" integer DEFAULT 0,
	"request_ip" text,
	"user_agent" text,
	"error_message" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tier" "user_tier" DEFAULT 'free';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "oracle_tokens_used" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "oracle_tokens_reset_at" timestamp;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "api_requests_today" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "api_requests_reset_at" timestamp;--> statement-breakpoint
ALTER TABLE "api_usage" ADD CONSTRAINT "api_usage_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_api_usage_user" ON "api_usage" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "idx_api_usage_endpoint" ON "api_usage" USING btree ("endpoint");--> statement-breakpoint
CREATE INDEX "idx_api_usage_created_at" ON "api_usage" USING btree ("created_at");