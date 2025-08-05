-- Create audit entity type enum
CREATE TYPE audit_entity_type AS ENUM ('file', 'supplier', 'email', 'user', 'extraction', 'connection');

-- Create audit outcome enum
CREATE TYPE audit_outcome AS ENUM ('success', 'failure', 'partial', 'skipped');

-- Create audit events table
CREATE TABLE IF NOT EXISTS audit_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL,
  
  -- Entity being audited
  entity_type audit_entity_type NOT NULL,
  entity_id TEXT NOT NULL,
  
  -- Event details
  event_type TEXT NOT NULL,
  decision TEXT NOT NULL,
  
  -- Context and metadata
  context JSONB,
  metadata JSONB,
  
  -- Decision outcome
  outcome audit_outcome NOT NULL,
  confidence NUMERIC(5, 4), -- 0.0000 to 1.0000
  
  -- Timing
  timestamp TIMESTAMP NOT NULL DEFAULT NOW(),
  duration NUMERIC(10, 3), -- Duration in milliseconds
  
  -- Correlation and hierarchy
  correlation_id UUID NOT NULL,
  parent_event_id UUID,
  
  -- Audit metadata
  user_id UUID,
  session_id TEXT,
  
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create indexes for query performance
CREATE INDEX audit_events_tenant_id_idx ON audit_events(tenant_id);
CREATE INDEX audit_events_entity_idx ON audit_events(entity_type, entity_id);
CREATE INDEX audit_events_event_type_idx ON audit_events(event_type);
CREATE INDEX audit_events_timestamp_idx ON audit_events(timestamp);
CREATE INDEX audit_events_correlation_idx ON audit_events(correlation_id);
CREATE INDEX audit_events_parent_event_idx ON audit_events(parent_event_id);

-- Composite indexes for common query patterns
CREATE INDEX audit_events_tenant_entity_idx ON audit_events(tenant_id, entity_type, entity_id);
CREATE INDEX audit_events_tenant_time_idx ON audit_events(tenant_id, timestamp);

-- Add foreign key constraint for parent-child relationships
ALTER TABLE audit_events 
ADD CONSTRAINT audit_events_parent_event_id_fkey 
FOREIGN KEY (parent_event_id) REFERENCES audit_events(id) ON DELETE CASCADE;