-- Add slack_linking_tokens table for manual account linking
CREATE TABLE IF NOT EXISTS slack_linking_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT NOT NULL UNIQUE,
  slack_user_id TEXT NOT NULL,
  workspace_id TEXT NOT NULL,
  slack_email TEXT,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT now()
);

-- Index for token lookup
CREATE INDEX idx_slack_linking_tokens_token ON slack_linking_tokens(token);

-- Index for cleanup of expired tokens
CREATE INDEX idx_slack_linking_tokens_expires_at ON slack_linking_tokens(expires_at);