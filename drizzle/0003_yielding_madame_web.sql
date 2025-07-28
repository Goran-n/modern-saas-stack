CREATE TYPE "public"."enrichment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'manual');--> statement-breakpoint
ALTER TABLE "files" ADD COLUMN "thumbnail_path" text;--> statement-breakpoint
ALTER TABLE "global_suppliers" ADD COLUMN "enrichment_status" "enrichment_status" DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE "global_suppliers" ADD COLUMN "enrichment_data" jsonb;--> statement-breakpoint
ALTER TABLE "global_suppliers" ADD COLUMN "last_enrichment_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "global_suppliers" ADD COLUMN "enrichment_attempts" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE INDEX "idx_global_suppliers_enrichment_status" ON "global_suppliers" USING btree ("enrichment_status");