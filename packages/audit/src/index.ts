export { AuditService } from "./service";
export { 
  AuditHelper,
  auditDecision,
  createAuditHelper,
  type AuditContext,
  type DecisionInfo,
} from "./middleware";
export {
  CorrelationManager,
  correlationManager,
  withCorrelation,
  correlationMiddleware,
  trpcCorrelationMiddleware,
  createJobCorrelationContext,
  createWebhookCorrelationContext,
  type CorrelationContext,
} from "./correlation";
export type {
  AuditQueryOptions,
  AuditMetrics,
} from "./service";

// Re-export types from shared-db for convenience
export type {
  AuditEvent,
  AuditEventContext,
  CreateAuditEventInput,
} from "@figgy/shared-db";