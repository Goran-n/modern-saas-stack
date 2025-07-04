ALTER TABLE "integrations" ADD COLUMN "next_scheduled_sync" timestamp;--> statement-breakpoint
ALTER TABLE "integrations" ADD COLUMN "sync_health" varchar(20) DEFAULT 'unknown';