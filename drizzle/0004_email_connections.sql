-- Create email provider enum
CREATE TYPE email_provider AS ENUM ('gmail', 'outlook', 'imap');

-- Create email connection status enum
CREATE TYPE email_connection_status AS ENUM ('active', 'inactive', 'error', 'expired');

-- Create email processing status enum
CREATE TYPE email_processing_status AS ENUM ('pending', 'processing', 'completed', 'failed');

-- Create email connections table
CREATE TABLE email_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  provider email_provider NOT NULL,
  email_address VARCHAR(255) NOT NULL,
  
  -- OAuth tokens (encrypted)
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP,
  
  -- IMAP credentials (encrypted)
  imap_host VARCHAR(255),
  imap_port INTEGER,
  imap_username VARCHAR(255),
  imap_password TEXT, -- encrypted
  
  -- Configuration
  folder_filter JSONB NOT NULL DEFAULT '["INBOX"]'::jsonb,
  sender_filter JSONB NOT NULL DEFAULT '[]'::jsonb,
  subject_filter JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Webhook configuration
  webhook_subscription_id VARCHAR(255),
  webhook_expires_at TIMESTAMP,
  
  -- Status
  status email_connection_status NOT NULL DEFAULT 'active',
  last_sync_at TIMESTAMP,
  last_error TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  
  -- Timestamps
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_by TEXT NOT NULL
);

-- Create email processing log table
CREATE TABLE email_processing_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  connection_id UUID NOT NULL REFERENCES email_connections(id) ON DELETE CASCADE,
  message_id VARCHAR(255) NOT NULL,
  thread_id VARCHAR(255),
  email_date TIMESTAMP NOT NULL,
  from_address VARCHAR(255),
  subject TEXT,
  attachment_count INTEGER NOT NULL DEFAULT 0,
  attachments_total_size INTEGER DEFAULT 0,
  processing_status email_processing_status NOT NULL DEFAULT 'pending',
  processed_at TIMESTAMP,
  processing_duration_ms INTEGER,
  file_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
  error_message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  
  -- Ensure unique message per connection
  UNIQUE(connection_id, message_id)
);

-- Create email rate limits table
CREATE TABLE email_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE UNIQUE,
  emails_per_minute INTEGER NOT NULL DEFAULT 10,
  attachments_per_hour INTEGER NOT NULL DEFAULT 100,
  total_size_per_day INTEGER NOT NULL DEFAULT 1000000000, -- 1GB default
  custom_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_email_connections_tenant_id ON email_connections(tenant_id);
CREATE INDEX idx_email_connections_status ON email_connections(status);
CREATE INDEX idx_email_connections_last_sync ON email_connections(last_sync_at);
CREATE INDEX idx_email_processing_log_connection_id ON email_processing_log(connection_id);
CREATE INDEX idx_email_processing_log_status ON email_processing_log(processing_status);
CREATE INDEX idx_email_processing_log_email_date ON email_processing_log(email_date);
CREATE INDEX idx_email_rate_limits_tenant_id ON email_rate_limits(tenant_id);

-- Create updated_at trigger function if not exists
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_email_connections_updated_at BEFORE UPDATE ON email_connections
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_email_rate_limits_updated_at BEFORE UPDATE ON email_rate_limits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();