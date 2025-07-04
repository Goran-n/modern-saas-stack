-- Create all enum types first
CREATE TYPE "public"."integration_type" AS ENUM('accounting', 'banking', 'payment', 'ecommerce', 'other');--> statement-breakpoint
CREATE TYPE "public"."integration_status" AS ENUM('setup_pending', 'connecting', 'connected', 'error', 'disabled');--> statement-breakpoint
CREATE TYPE "public"."tenant_status" AS ENUM('active', 'suspended', 'deleted');--> statement-breakpoint
CREATE TYPE "public"."member_role" AS ENUM('viewer', 'member', 'admin', 'owner');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('pending', 'active', 'suspended', 'removed');--> statement-breakpoint

-- Create tables that don't depend on other enums first
CREATE TABLE "tenants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"email" varchar(255) NOT NULL,
	"status" "tenant_status" DEFAULT 'active' NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"subscription" jsonb DEFAULT '{}' NOT NULL,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp,
	CONSTRAINT "tenants_slug_unique" UNIQUE("slug"),
	CONSTRAINT "tenants_email_unique" UNIQUE("email")
);--> statement-breakpoint

CREATE TABLE "integrations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"integration_type" "integration_type" NOT NULL,
	"provider" varchar(100) NOT NULL,
	"name" varchar(255) NOT NULL,
	"auth_data" jsonb NOT NULL,
	"settings" jsonb DEFAULT '{}' NOT NULL,
	"status" "integration_status" DEFAULT 'setup_pending' NOT NULL,
	"last_sync_at" timestamp,
	"last_error" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "tenant_members" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"user_id" text NOT NULL,
	"role" "member_role" DEFAULT 'member' NOT NULL,
	"permissions" jsonb DEFAULT '{}' NOT NULL,
	"status" "member_status" DEFAULT 'pending' NOT NULL,
	"invited_by" text,
	"invited_email" varchar(255),
	"invitation_token" varchar(255),
	"invitation_expires_at" timestamp,
	"joined_at" timestamp DEFAULT now() NOT NULL,
	"last_access_at" timestamp,
	"invited_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

CREATE TABLE "integration_sync_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"integration_id" uuid NOT NULL,
	"sync_type" varchar(100) NOT NULL,
	"status" varchar(50) NOT NULL,
	"records_processed" jsonb DEFAULT '{}' NOT NULL,
	"errors" jsonb DEFAULT '[]' NOT NULL,
	"warnings" jsonb DEFAULT '[]' NOT NULL,
	"started_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"metadata" jsonb DEFAULT '{}' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);--> statement-breakpoint

-- Add foreign key constraints
ALTER TABLE "integrations" ADD CONSTRAINT "integrations_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tenant_members" ADD CONSTRAINT "tenant_members_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "integration_sync_logs" ADD CONSTRAINT "integration_sync_logs_integration_id_integrations_id_fk" FOREIGN KEY ("integration_id") REFERENCES "public"."integrations"("id") ON DELETE cascade ON UPDATE no action;