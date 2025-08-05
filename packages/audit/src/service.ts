import {
  auditEvents,
  type AuditEvent,
  type CreateAuditEventInput,
  type DrizzleClient,
  and,
  desc,
  eq,
  gte,
  lte,
  sql,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { v4 as uuidv4 } from "uuid";
import { correlationManager } from "./correlation";

const logger = createLogger("audit-service");

export interface AuditQueryOptions {
  tenantId: string;
  entityType?: string;
  entityId?: string;
  eventType?: string;
  correlationId?: string;
  parentEventId?: string;
  outcome?: 'success' | 'failure' | 'partial' | 'skipped';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}

export interface AuditMetrics {
  totalEvents: number;
  successRate: number;
  averageConfidence: number;
  eventsByType: Record<string, number>;
  eventsByOutcome: Record<string, number>;
  recentActivity: AuditEvent[];
}

export class AuditService {
  constructor(private db: DrizzleClient) {}

  /**
   * Create a new audit event
   */
  async createEvent(input: CreateAuditEventInput): Promise<AuditEvent> {
    try {
      // Try to use current correlation context if not provided
      const currentContext = correlationManager.getCurrentContext();
      const enrichedInput: any = {
        ...input,
        correlationId: input.correlationId || currentContext?.correlationId || uuidv4(),
        userId: input.userId || currentContext?.userId,
        sessionId: input.sessionId || currentContext?.sessionId,
        timestamp: new Date(),
      };
      
      // Convert numeric fields to strings for database storage
      if (input.confidence !== undefined) {
        enrichedInput.confidence = input.confidence.toString();
      }
      if (input.duration !== undefined) {
        enrichedInput.duration = input.duration.toString();
      }

      const [event] = await this.db
        .insert(auditEvents)
        .values(enrichedInput)
        .returning();

      if (!event) {
        throw new Error("Failed to create audit event");
      }

      logger.debug("Audit event created", {
        eventId: event.id,
        tenantId: enrichedInput.tenantId,
        entityType: enrichedInput.entityType,
        eventType: enrichedInput.eventType,
        correlationId: enrichedInput.correlationId,
        fromContext: !!currentContext,
      });

      return event;
    } catch (error) {
      logger.error("Failed to create audit event", {
        error: error instanceof Error ? error.message : String(error),
        input: {
          ...input,
          context: "[REDACTED]", // Don't log sensitive context data
        },
      });
      throw error;
    }
  }

  /**
   * Create multiple audit events in a batch
   */
  async createEventsBatch(inputs: CreateAuditEventInput[]): Promise<AuditEvent[]> {
    if (inputs.length === 0) return [];

    try {
      const events = await this.db
        .insert(auditEvents)
        .values(
          inputs.map(input => {
            const value: any = {
              ...input,
              timestamp: new Date(),
            };
            // Convert numeric fields to strings for database storage
            if (input.confidence !== undefined) {
              value.confidence = input.confidence.toString();
            }
            if (input.duration !== undefined) {
              value.duration = input.duration.toString();
            }
            return value;
          })
        )
        .returning();

      logger.debug("Batch audit events created", {
        count: events.length,
        tenantIds: [...new Set(inputs.map(i => i.tenantId))],
      });

      return events;
    } catch (error) {
      logger.error("Failed to create batch audit events", {
        error: error instanceof Error ? error.message : String(error),
        count: inputs.length,
      });
      throw error;
    }
  }

  /**
   * Query audit events with filters
   */
  async queryEvents(options: AuditQueryOptions): Promise<AuditEvent[]> {
    try {
      // Build conditions array
      const conditions = [eq(auditEvents.tenantId, options.tenantId)];

      if (options.entityType) {
        conditions.push(eq(auditEvents.entityType, options.entityType as any));
      }

      if (options.entityId) {
        conditions.push(eq(auditEvents.entityId, options.entityId));
      }

      if (options.eventType) {
        conditions.push(eq(auditEvents.eventType, options.eventType));
      }

      if (options.correlationId) {
        conditions.push(eq(auditEvents.correlationId, options.correlationId));
      }

      if (options.parentEventId) {
        conditions.push(eq(auditEvents.parentEventId, options.parentEventId));
      }

      if (options.outcome) {
        conditions.push(eq(auditEvents.outcome, options.outcome as any));
      }

      if (options.startDate) {
        conditions.push(gte(auditEvents.timestamp, options.startDate));
      }

      if (options.endDate) {
        conditions.push(lte(auditEvents.timestamp, options.endDate));
      }

      // Build and execute query
      const events = await this.db
        .select()
        .from(auditEvents)
        .where(and(...conditions))
        .orderBy(desc(auditEvents.timestamp))
        .limit(options.limit || 100)
        .offset(options.offset || 0);

      logger.debug("Audit events queried", {
        tenantId: options.tenantId,
        count: events.length,
        filters: Object.keys(options).filter(k => k !== 'tenantId' && options[k as keyof AuditQueryOptions] !== undefined),
      });

      return events;
    } catch (error) {
      logger.error("Failed to query audit events", {
        error: error instanceof Error ? error.message : String(error),
        options,
      });
      throw error;
    }
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityAuditTrail(
    tenantId: string,
    entityType: string,
    entityId: string,
    limit: number = 50
  ): Promise<AuditEvent[]> {
    return this.queryEvents({
      tenantId,
      entityType,
      entityId,
      limit,
    });
  }

  /**
   * Get all events in a correlation chain
   */
  async getCorrelationChain(
    tenantId: string,
    correlationId: string
  ): Promise<AuditEvent[]> {
    return this.queryEvents({
      tenantId,
      correlationId,
    });
  }

  /**
   * Get hierarchical decision tree for parent event
   */
  async getDecisionTree(
    tenantId: string,
    parentEventId: string
  ): Promise<AuditEvent[]> {
    const events = await this.queryEvents({
      tenantId,
      parentEventId,
    });

    // Recursively get child events
    const allEvents: AuditEvent[] = [...events];
    
    for (const event of events) {
      const children = await this.getDecisionTree(tenantId, event.id);
      allEvents.push(...children);
    }

    return allEvents;
  }

  /**
   * Get audit metrics for a tenant
   */
  async getMetrics(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<AuditMetrics> {
    try {
      const queryOptions: AuditQueryOptions = {
        tenantId,
        ...(startDate !== undefined && { startDate }),
        ...(endDate !== undefined && { endDate }),
        limit: 1000, // Reasonable limit for metrics calculation
      };

      const events = await this.queryEvents(queryOptions);

      const totalEvents = events.length;
      const successEvents = events.filter(e => e.outcome === 'success').length;
      const successRate = totalEvents > 0 ? successEvents / totalEvents : 0;

      // Calculate average confidence (only for events with confidence scores)
      const eventsWithConfidence = events.filter(e => e.confidence !== null);
      const averageConfidence = eventsWithConfidence.length > 0 
        ? eventsWithConfidence.reduce((sum, e) => sum + (Number(e.confidence) || 0), 0) / eventsWithConfidence.length
        : 0;

      // Group by event type
      const eventsByType = events.reduce((acc, event) => {
        acc[event.eventType] = (acc[event.eventType] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Group by outcome
      const eventsByOutcome = events.reduce((acc, event) => {
        acc[event.outcome] = (acc[event.outcome] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      // Get recent activity (last 10 events)
      const recentActivity = events.slice(0, 10);

      return {
        totalEvents,
        successRate,
        averageConfidence,
        eventsByType,
        eventsByOutcome,
        recentActivity,
      };
    } catch (error) {
      logger.error("Failed to get audit metrics", {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
      });
      throw error;
    }
  }

  /**
   * Generate a new correlation ID
   */
  generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Create a child audit event with parent relationship
   */
  async createChildEvent(
    parentEvent: AuditEvent,
    input: Omit<CreateAuditEventInput, 'tenantId' | 'correlationId' | 'parentEventId'>
  ): Promise<AuditEvent> {
    return this.createEvent({
      ...input,
      tenantId: parentEvent.tenantId,
      correlationId: parentEvent.correlationId,
      parentEventId: parentEvent.id,
    });
  }

  /**
   * Search audit events by text (searches in decision and context)
   */
  async searchEvents(
    tenantId: string,
    searchText: string,
    limit: number = 50
  ): Promise<AuditEvent[]> {
    try {
      const events = await this.db
        .select()
        .from(auditEvents)
        .where(
          and(
            eq(auditEvents.tenantId, tenantId),
            sql`(
              ${auditEvents.decision} ILIKE ${`%${searchText}%`} OR
              ${auditEvents.eventType} ILIKE ${`%${searchText}%`} OR
              ${auditEvents.context}::text ILIKE ${`%${searchText}%`}
            )`
          )
        )
        .orderBy(desc(auditEvents.timestamp))
        .limit(limit);

      logger.debug("Audit events searched", {
        tenantId,
        searchText,
        count: events.length,
      });

      return events;
    } catch (error) {
      logger.error("Failed to search audit events", {
        error: error instanceof Error ? error.message : String(error),
        tenantId,
        searchText,
      });
      throw error;
    }
  }
}