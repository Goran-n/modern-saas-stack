-- Drop foreign key constraints
ALTER TABLE "user_channels" DROP CONSTRAINT IF EXISTS "user_channels_user_id_users_id_fk";
ALTER TABLE "conversations" DROP CONSTRAINT IF EXISTS "conversations_user_id_users_id_fk";

-- Drop existing indexes that depend on user_id
DROP INDEX IF EXISTS "idx_user_channels_user";
DROP INDEX IF EXISTS "idx_conversations_user";
DROP INDEX IF EXISTS "unique_user_channel";

-- Change user_id columns from UUID to TEXT
ALTER TABLE "user_channels" ALTER COLUMN "user_id" SET DATA TYPE TEXT USING user_id::TEXT;
ALTER TABLE "conversations" ALTER COLUMN "user_id" SET DATA TYPE TEXT USING user_id::TEXT;

-- Recreate indexes with the new TEXT column type
CREATE INDEX "idx_user_channels_user" ON "user_channels" USING btree ("user_id");
CREATE INDEX "idx_conversations_user" ON "conversations" USING btree ("user_id");
CREATE INDEX "unique_user_channel" ON "user_channels" USING btree ("user_id", "channel_type", "channel_identifier");