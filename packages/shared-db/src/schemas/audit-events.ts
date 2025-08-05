import {
  index,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

// Enum for entity types that can be audited
export const auditEntityTypeEnum = pgEnum("audit_entity_type", [
  "file",
  "supplier",
  "email",
  "user",
  "extraction",
  "connection",
]);

// Enum for audit event outcomes
export const auditOutcomeEnum = pgEnum("audit_outcome", [
  "success",
  "failure", 
  "partial",
  "skipped",
]);

// Main audit events table
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    tenantId: uuid("tenant_id").notNull(),
    
    // Entity being audited
    entityType: auditEntityTypeEnum("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    
    // Event details
    eventType: text("event_type").notNull(), // e.g., 'file.upload', 'extraction.classify'
    decision: text("decision").notNull(), // Human-readable decision description
    
    // Context and metadata
    context: jsonb("context"), // Flexible context data
    metadata: jsonb("metadata"), // Additional metadata
    
    // Decision outcome
    outcome: auditOutcomeEnum("outcome").notNull(),
    confidence: numeric("confidence", { precision: 5, scale: 4 }), // 0.0000 to 1.0000
    
    // Timing
    timestamp: timestamp("timestamp").notNull().defaultNow(),
    duration: numeric("duration", { precision: 10, scale: 3 }), // Duration in milliseconds
    
    // Correlation and hierarchy
    correlationId: uuid("correlation_id").notNull(), // Links related decisions
    parentEventId: uuid("parent_event_id"), // For hierarchical decisions
    
    // Audit metadata
    userId: uuid("user_id"), // User who triggered the action (if applicable)
    sessionId: text("session_id"), // Session identifier
    
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    // Primary indexes for query performance
    tenantIdIdx: index("audit_events_tenant_id_idx").on(table.tenantId),
    entityIdx: index("audit_events_entity_idx").on(table.entityType, table.entityId),
    eventTypeIdx: index("audit_events_event_type_idx").on(table.eventType),
    timestampIdx: index("audit_events_timestamp_idx").on(table.timestamp),
    correlationIdx: index("audit_events_correlation_idx").on(table.correlationId),
    parentEventIdx: index("audit_events_parent_event_idx").on(table.parentEventId),
    
    // Composite indexes for common query patterns
    tenantEntityIdx: index("audit_events_tenant_entity_idx").on(
      table.tenantId, 
      table.entityType, 
      table.entityId
    ),
    tenantTimeIdx: index("audit_events_tenant_time_idx").on(
      table.tenantId, 
      table.timestamp
    ),
  })
);

// Audit event context interface for type safety
export interface AuditEventContext {
  // File processing context
  fileProcessing?: {
    fileName?: string;
    mimeType?: string;
    size?: number;
    source?: string;
    processingStep?: string;
    contentType?: string;
  };
  
  // Document extraction context
  extraction?: {
    extractorType?: string;
    aiModel?: string;
    promptVersion?: string;
    inputTokens?: number;
    outputTokens?: number;
    extractedFields?: Record<string, any>;
    documentType?: string;
    processingStep?: string;
    extractionId?: string;
  };
  
  // Supplier matching context
  supplierMatching?: {
    candidateSuppliers?: Array<{
      id: string;
      name: string;
      confidence: number;
    }>;
    matchingStrategy?: string;
    rules?: string[];
    vendorName?: string;
    matchedSupplierName?: string;
  };
  
  // Email processing context
  emailProcessing?: {
    messageId?: string;
    subject?: string;
    sender?: string;
    attachmentCount?: number;
    filters?: string[];
    provider?: string;
    emailAddress?: string;
    connectionStatus?: string;
    attachmentName?: string;
    attachmentSize?: number;
    triggeredBy?: string;
    status?: string;
    error?: string;
    folderFilter?: string[];
    senderFilter?: string[];
    subjectFilter?: string[];
    processedCount?: number;
    errorCount?: number;
  };
  
  // User action context
  userAction?: {
    action?: string;
    interface?: string;
    ipAddress?: string;
    userAgent?: string;
  };
  
  // Generic context for extensibility
  [key: string]: any;
}

// Type exports
export type AuditEvent = typeof auditEvents.$inferSelect;
export type NewAuditEvent = typeof auditEvents.$inferInsert;

// Helper type for creating audit events
export interface CreateAuditEventInput {
  tenantId: string;
  entityType: 'file' | 'supplier' | 'email' | 'user' | 'extraction' | 'connection';
  entityId: string;
  eventType: string;
  decision: string;
  context?: AuditEventContext;
  metadata?: Record<string, any>;
  outcome: 'success' | 'failure' | 'partial' | 'skipped';
  confidence?: number;
  duration?: number;
  correlationId: string;
  parentEventId?: string;
  userId?: string;
  sessionId?: string;
}