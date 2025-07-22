-- Add tenant_id column to slack_user_mappings (nullable first)
ALTER TABLE "slack_user_mappings" ADD COLUMN IF NOT EXISTS "tenant_id" uuid;

-- Update existing rows to set tenant_id from slack_workspaces
UPDATE "slack_user_mappings" sm
SET "tenant_id" = sw."tenant_id"
FROM "slack_workspaces" sw
WHERE sm."workspace_id" = sw."workspace_id"
AND sm."tenant_id" IS NULL;

-- Now make the column NOT NULL after data is populated
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'slack_user_mappings' 
        AND column_name = 'tenant_id' 
        AND is_nullable = 'YES'
    ) THEN
        ALTER TABLE "slack_user_mappings" ALTER COLUMN "tenant_id" SET NOT NULL;
    END IF;
END $$;

-- Drop the old primary key if it exists
DO $$ 
BEGIN 
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'slack_user_mappings_workspace_id_slack_user_id_pk'
        AND table_name = 'slack_user_mappings'
    ) THEN
        ALTER TABLE "slack_user_mappings" DROP CONSTRAINT "slack_user_mappings_workspace_id_slack_user_id_pk";
    END IF;
END $$;

-- Add the new composite primary key if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'slack_user_mappings_workspace_id_slack_user_id_tenant_id_pk'
        AND table_name = 'slack_user_mappings'
    ) THEN
        ALTER TABLE "slack_user_mappings" ADD CONSTRAINT "slack_user_mappings_workspace_id_slack_user_id_tenant_id_pk" PRIMARY KEY("workspace_id","slack_user_id","tenant_id");
    END IF;
END $$;