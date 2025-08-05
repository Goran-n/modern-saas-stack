-- Remove foreign key constraint from email_processing_log.connection_id
-- This allows the table to reference both emailConnections and oauthConnections
ALTER TABLE email_processing_log 
DROP CONSTRAINT IF EXISTS email_processing_log_connection_id_email_connections_id_fk;

-- Add comment to explain the change
COMMENT ON COLUMN email_processing_log.connection_id IS 'Can reference either email_connections.id or oauth_connections.id';