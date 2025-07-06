-- Apply user_channels schema changes for centralized WhatsApp integration

-- First, let's check current state
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_channels'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- Add new columns if they don't exist
DO $$ 
BEGIN
    -- Add is_verified column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_channels' 
        AND column_name = 'is_verified'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_channels ADD COLUMN is_verified boolean DEFAULT false NOT NULL;
        RAISE NOTICE 'Added is_verified column';
    ELSE
        RAISE NOTICE 'is_verified column already exists';
    END IF;

    -- Add verification_code column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_channels' 
        AND column_name = 'verification_code'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_channels ADD COLUMN verification_code varchar(6);
        RAISE NOTICE 'Added verification_code column';
    ELSE
        RAISE NOTICE 'verification_code column already exists';
    END IF;

    -- Add verification_expires_at column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_channels' 
        AND column_name = 'verification_expires_at'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_channels ADD COLUMN verification_expires_at timestamp;
        RAISE NOTICE 'Added verification_expires_at column';
    ELSE
        RAISE NOTICE 'verification_expires_at column already exists';
    END IF;

    -- Drop auth_data column if it exists
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'user_channels' 
        AND column_name = 'auth_data'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE user_channels DROP COLUMN auth_data;
        RAISE NOTICE 'Dropped auth_data column';
    ELSE
        RAISE NOTICE 'auth_data column does not exist';
    END IF;
END $$;

-- Show final state
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'user_channels'
AND table_schema = 'public'
ORDER BY ordinal_position;