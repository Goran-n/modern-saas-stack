-- Create all missing enum types
DO $$ BEGIN
    CREATE TYPE "sync_job_status" AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "sync_job_type" AS ENUM('full', 'incremental', 'manual', 'webhook');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "provider_type" AS ENUM('xero', 'quickbooks', 'sage', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "transaction_status" AS ENUM('pending', 'validated', 'posted', 'reconciled', 'disputed', 'refunded');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "enrichment_status" AS ENUM('pending', 'processing', 'completed', 'failed', 'manual');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "integration_status" AS ENUM('setup_pending', 'connecting', 'connected', 'error', 'disabled');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "integration_sync_status" AS ENUM('unknown', 'healthy', 'warning', 'error');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE "tenant_status" AS ENUM('active', 'suspended', 'deleted');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;