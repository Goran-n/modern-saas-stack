CREATE TYPE "public"."member_role" AS ENUM('viewer', 'member', 'admin', 'owner');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('pending', 'active', 'suspended', 'removed');