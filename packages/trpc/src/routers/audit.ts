import { AuditService, type AuditQueryOptions } from "@figgy/audit";
import type { AuditEvent } from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { tenantProcedure } from "../trpc/procedures";

const logger = createLogger("audit-router");

// Input schemas
const queryEventsSchema = z.object({
  entityType: z.enum(['file', 'supplier', 'email', 'user', 'extraction', 'connection']).optional(),
  entityId: z.string().optional(),
  eventType: z.string().optional(),
  correlationId: z.string().uuid().optional(),
  parentEventId: z.string().uuid().optional(),
  outcome: z.enum(['success', 'failure', 'partial', 'skipped']).optional(),
  startDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  limit: z.number().int().positive().max(1000).default(50),
  offset: z.number().int().min(0).default(0),
});

const entityAuditTrailSchema = z.object({
  entityType: z.enum(['file', 'supplier', 'email', 'user', 'extraction', 'connection']),
  entityId: z.string(),
  limit: z.number().int().positive().max(200).default(50),
});

const correlationChainSchema = z.object({
  correlationId: z.string().uuid(),
});

const decisionTreeSchema = z.object({
  parentEventId: z.string().uuid(),
});

const searchEventsSchema = z.object({
  searchText: z.string().min(1).max(500),
  limit: z.number().int().positive().max(100).default(50),
});

const metricsSchema = z.object({
  startDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
});

export const auditRouter = createTRPCRouter({
  /**
   * Query audit events with filters
   */
  queryEvents: tenantProcedure
    .input(queryEventsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const auditService = new AuditService(ctx.db);
        
        const queryOptions: AuditQueryOptions = {
          tenantId: ctx.tenant.id,
          ...(input.entityType && { entityType: input.entityType }),
          ...(input.entityId && { entityId: input.entityId }),
          ...(input.eventType && { eventType: input.eventType }),
          ...(input.correlationId && { correlationId: input.correlationId }),
          ...(input.parentEventId && { parentEventId: input.parentEventId }),
          ...(input.outcome && { outcome: input.outcome }),
          ...(input.startDate && { startDate: input.startDate }),
          ...(input.endDate && { endDate: input.endDate }),
          ...(input.limit && { limit: input.limit }),
          ...(input.offset && { offset: input.offset }),
        };

        const events = await auditService.queryEvents(queryOptions);

        logger.info("Audit events queried", {
          tenantId: ctx.tenant.id,
          count: events.length,
          filters: Object.keys(input).filter(k => input[k as keyof typeof input] !== undefined),
        });

        return {
          events,
          count: events.length,
          hasMore: events.length === input.limit,
        };
      } catch (error) {
        logger.error("Failed to query audit events", {
          error: error instanceof Error ? error.message : String(error),
          tenantId: ctx.tenant.id,
          input,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to query audit events",
        });
      }
    }),

  /**
   * Get audit trail for a specific entity
   */
  getEntityAuditTrail: tenantProcedure
    .input(entityAuditTrailSchema)
    .query(async ({ ctx, input }) => {
      try {
        const auditService = new AuditService(ctx.db);
        
        const events = await auditService.getEntityAuditTrail(
          ctx.tenant.id,
          input.entityType,
          input.entityId,
          input.limit
        );

        logger.info("Entity audit trail retrieved", {
          tenantId: ctx.tenant.id,
          entityType: input.entityType,
          entityId: input.entityId,
          count: events.length,
        });

        return {
          events,
          entityType: input.entityType,
          entityId: input.entityId,
          count: events.length,
        };
      } catch (error) {
        logger.error("Failed to get entity audit trail", {
          error: error instanceof Error ? error.message : String(error),
          tenantId: ctx.tenant.id,
          input,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get entity audit trail",
        });
      }
    }),

  /**
   * Get all events in a correlation chain
   */
  getCorrelationChain: tenantProcedure
    .input(correlationChainSchema)
    .query(async ({ ctx, input }) => {
      try {
        const auditService = new AuditService(ctx.db);
        
        const events = await auditService.getCorrelationChain(
          ctx.tenant.id,
          input.correlationId
        );

        logger.info("Correlation chain retrieved", {
          tenantId: ctx.tenant.id,
          correlationId: input.correlationId,
          count: events.length,
        });

        // Group events by entity for better visualization
        const groupedEvents = events.reduce((acc: Record<string, AuditEvent[]>, event) => {
          const key = `${event.entityType}:${event.entityId}`;
          if (!acc[key]) {
            acc[key] = [];
          }
          acc[key].push(event);
          return acc;
        }, {} as Record<string, typeof events>);

        return {
          events,
          groupedEvents,
          correlationId: input.correlationId,
          count: events.length,
          entityCount: Object.keys(groupedEvents).length,
        };
      } catch (error) {
        logger.error("Failed to get correlation chain", {
          error: error instanceof Error ? error.message : String(error),
          tenantId: ctx.tenant.id,
          input,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get correlation chain",
        });
      }
    }),

  /**
   * Get hierarchical decision tree for parent event
   */
  getDecisionTree: tenantProcedure
    .input(decisionTreeSchema)
    .query(async ({ ctx, input }) => {
      try {
        const auditService = new AuditService(ctx.db);
        
        const events = await auditService.getDecisionTree(
          ctx.tenant.id,
          input.parentEventId
        );

        // Build hierarchical structure
        const buildTree = (parentId: string | null): any[] => {
          return events
            .filter((event: AuditEvent) => event.parentEventId === parentId)
            .map((event: AuditEvent) => ({
              ...event,
              children: buildTree(event.id),
            }));
        };

        const tree = buildTree(input.parentEventId);

        logger.info("Decision tree retrieved", {
          tenantId: ctx.tenant.id,
          parentEventId: input.parentEventId,
          totalEvents: events.length,
          rootNodes: tree.length,
        });

        return {
          tree,
          allEvents: events,
          parentEventId: input.parentEventId,
          totalEvents: events.length,
        };
      } catch (error) {
        logger.error("Failed to get decision tree", {
          error: error instanceof Error ? error.message : String(error),
          tenantId: ctx.tenant.id,
          input,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get decision tree",
        });
      }
    }),

  /**
   * Search audit events by text
   */
  searchEvents: tenantProcedure
    .input(searchEventsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const auditService = new AuditService(ctx.db);
        
        const events = await auditService.searchEvents(
          ctx.tenant.id,
          input.searchText,
          input.limit
        );

        logger.info("Audit events searched", {
          tenantId: ctx.tenant.id,
          searchText: input.searchText,
          count: events.length,
        });

        return {
          events,
          searchText: input.searchText,
          count: events.length,
          hasMore: events.length === input.limit,
        };
      } catch (error) {
        logger.error("Failed to search audit events", {
          error: error instanceof Error ? error.message : String(error),
          tenantId: ctx.tenant.id,
          input,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to search audit events",
        });
      }
    }),

  /**
   * Get audit metrics for the tenant
   */
  getMetrics: tenantProcedure
    .input(metricsSchema)
    .query(async ({ ctx, input }) => {
      try {
        const auditService = new AuditService(ctx.db);
        
        const metrics = await auditService.getMetrics(
          ctx.tenant.id,
          input.startDate,
          input.endDate
        );

        logger.info("Audit metrics retrieved", {
          tenantId: ctx.tenant.id,
          totalEvents: metrics.totalEvents,
          successRate: metrics.successRate,
          startDate: input.startDate?.toISOString(),
          endDate: input.endDate?.toISOString(),
        });

        return metrics;
      } catch (error) {
        logger.error("Failed to get audit metrics", {
          error: error instanceof Error ? error.message : String(error),
          tenantId: ctx.tenant.id,
          input,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get audit metrics",
        });
      }
    }),

  /**
   * Get recent audit activity for dashboard
   */
  getRecentActivity: tenantProcedure
    .input(z.object({
      limit: z.number().int().positive().max(50).default(20),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const auditService = new AuditService(ctx.db);
        
        const events = await auditService.queryEvents({
          tenantId: ctx.tenant.id,
          limit: input.limit,
          offset: 0,
        });

        // Group by correlation ID to show related activities
        const correlationGroups = events.reduce((acc: Record<string, AuditEvent[]>, event) => {
          const correlationId = event.correlationId || 'unknown';
          if (!acc[correlationId]) {
            acc[correlationId] = [];
          }
          acc[correlationId].push(event);
          return acc;
        }, {} as Record<string, typeof events>);

        logger.info("Recent audit activity retrieved", {
          tenantId: ctx.tenant.id,
          eventCount: events.length,
          correlationGroups: Object.keys(correlationGroups).length,
        });

        return {
          events,
          correlationGroups,
          count: events.length,
        };
      } catch (error) {
        logger.error("Failed to get recent audit activity", {
          error: error instanceof Error ? error.message : String(error),
          tenantId: ctx.tenant.id,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get recent audit activity",
        });
      }
    }),

  /**
   * Get audit summary by event type
   */
  getEventTypeSummary: tenantProcedure
    .input(z.object({
      startDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
      endDate: z.string().datetime().optional().transform(val => val ? new Date(val) : undefined),
    }))
    .query(async ({ ctx, input }) => {
      try {
        const auditService = new AuditService(ctx.db);
        
        const queryOptions: AuditQueryOptions = {
          tenantId: ctx.tenant.id,
          limit: 10000, // Large limit to get comprehensive data
          ...(input.startDate && { startDate: input.startDate }),
          ...(input.endDate && { endDate: input.endDate }),
        };
        
        const events = await auditService.queryEvents(queryOptions);

        // Aggregate by event type
        const summary = events.reduce((acc: Record<string, any>, event) => {
          if (!acc[event.eventType]) {
            acc[event.eventType] = {
              eventType: event.eventType,
              totalCount: 0,
              successCount: 0,
              failureCount: 0,
              partialCount: 0,
              skippedCount: 0,
              averageConfidence: 0,
              confidenceSum: 0,
              confidenceCount: 0,
              recentEvents: [] as typeof events,
            };
          }

          const summary_item = acc[event.eventType];
          summary_item.totalCount++;
          summary_item[`${event.outcome}Count`]++;

          if (event.confidence !== null) {
            summary_item.confidenceSum += Number(event.confidence);
            summary_item.confidenceCount++;
          }

          // Keep recent events (max 5 per type)
          if (summary_item.recentEvents.length < 5) {
            summary_item.recentEvents.push(event);
          }

          return acc;
        }, {} as Record<string, any>);

        // Calculate average confidence
        Object.values(summary).forEach((item: any) => {
          if (item.confidenceCount > 0) {
            item.averageConfidence = item.confidenceSum / item.confidenceCount;
          }
          delete item.confidenceSum; // Clean up internal fields
          delete item.confidenceCount;
        });

        logger.info("Event type summary retrieved", {
          tenantId: ctx.tenant.id,
          eventTypes: Object.keys(summary).length,
          totalEvents: events.length,
        });

        return {
          summary,
          totalEvents: events.length,
          eventTypes: Object.keys(summary).length,
          dateRange: {
            startDate: input.startDate?.toISOString(),
            endDate: input.endDate?.toISOString(),
          },
        };
      } catch (error) {
        logger.error("Failed to get event type summary", {
          error: error instanceof Error ? error.message : String(error),
          tenantId: ctx.tenant.id,
        });
        
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to get event type summary",
        });
      }
    }),
});