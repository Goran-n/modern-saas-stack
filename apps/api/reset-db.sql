-- First, drop all enum types that might exist (ignore errors)
DROP TYPE IF EXISTS sync_job_status CASCADE;
DROP TYPE IF EXISTS sync_job_type CASCADE;
DROP TYPE IF EXISTS provider_type CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS enrichment_status CASCADE;
DROP TYPE IF EXISTS integration_status CASCADE;
DROP TYPE IF EXISTS integration_sync_status CASCADE;
DROP TYPE IF EXISTS integration_type CASCADE;
DROP TYPE IF EXISTS tenant_status CASCADE;

-- Create all enum types
CREATE TYPE sync_job_status AS ENUM('pending', 'running', 'completed', 'failed', 'cancelled');
CREATE TYPE sync_job_type AS ENUM('full', 'incremental', 'manual', 'webhook', 'initial');
CREATE TYPE provider_type AS ENUM('xero', 'quickbooks', 'sage', 'other');
CREATE TYPE transaction_status AS ENUM('pending', 'validated', 'posted', 'reconciled', 'disputed', 'refunded');
CREATE TYPE enrichment_status AS ENUM('pending', 'processing', 'completed', 'failed', 'manual');
CREATE TYPE integration_status AS ENUM('setup_pending', 'connecting', 'connected', 'error', 'disabled');
CREATE TYPE integration_sync_status AS ENUM('unknown', 'healthy', 'warning', 'error');
CREATE TYPE integration_type AS ENUM('accounting', 'banking', 'payment', 'ecommerce', 'other');
CREATE TYPE tenant_status AS ENUM('active', 'suspended', 'deleted');