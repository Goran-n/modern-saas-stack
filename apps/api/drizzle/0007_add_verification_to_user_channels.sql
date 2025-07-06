-- Remove auth_data column
ALTER TABLE "user_channels" DROP COLUMN IF EXISTS "auth_data";

-- Add verification columns
ALTER TABLE "user_channels" ADD COLUMN IF NOT EXISTS "is_verified" boolean DEFAULT false NOT NULL;
ALTER TABLE "user_channels" ADD COLUMN IF NOT EXISTS "verification_code" varchar(6);
ALTER TABLE "user_channels" ADD COLUMN IF NOT EXISTS "verification_expires_at" timestamp;