import type { 
  AuditEventContext, 
  CreateAuditEventInput,
  DrizzleClient 
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { v4 as uuidv4 } from "uuid";
import { AuditService } from "./service";

const logger = createLogger("audit-middleware");

export interface AuditContext {
  tenantId: string;
  userId?: string;
  sessionId?: string;
  correlationId: string;
  db: DrizzleClient;
}

export interface DecisionInfo {
  entityType: 'file' | 'supplier' | 'email' | 'user' | 'extraction' | 'connection';
  entityId: string;
  eventType: string;
  decision: string;
  context?: AuditEventContext;
  metadata?: Record<string, any>;
  confidence?: number;
  duration?: number;
  parentEventId?: string;
}

/**
 * Audit middleware decorator for automatic decision tracking
 */
export function auditDecision<T extends any[], R>(
  getDecisionInfo: (...args: T) => DecisionInfo,
  getAuditContext: (...args: T) => AuditContext
) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      const startTime = Date.now();
      const auditContext = getAuditContext(...args);
      const auditService = new AuditService(auditContext.db);

      let result: R;
      let outcome: 'success' | 'failure' | 'partial' | 'skipped' = 'success';
      let error: Error | undefined;

      try {
        result = await originalMethod.apply(this, args);
        outcome = 'success';
      } catch (err) {
        error = err instanceof Error ? err : new Error(String(err));
        outcome = 'failure';
        throw err;
      } finally {
        try {
          const duration = Date.now() - startTime;
          const decisionInfo = getDecisionInfo(...args);

          const auditInput: CreateAuditEventInput = {
            tenantId: auditContext.tenantId,
            entityType: decisionInfo.entityType,
            entityId: decisionInfo.entityId,
            eventType: decisionInfo.eventType,
            decision: decisionInfo.decision,
            context: {
              ...decisionInfo.context,
              method: propertyKey,
              className: target.constructor.name,
              ...(error && {
                error: {
                  message: error.message,
                  stack: error.stack,
                }
              }),
            },
            outcome,
            correlationId: auditContext.correlationId || uuidv4(),
            ...(decisionInfo.metadata !== undefined && { metadata: decisionInfo.metadata }),
            ...(decisionInfo.confidence !== undefined && { confidence: decisionInfo.confidence }),
            ...(duration !== undefined && { duration }),
            ...(decisionInfo.parentEventId !== undefined && { parentEventId: decisionInfo.parentEventId }),
            ...(auditContext.userId !== undefined && { userId: auditContext.userId }),
            ...(auditContext.sessionId !== undefined && { sessionId: auditContext.sessionId }),
          };

          await auditService.createEvent(auditInput);
        } catch (auditError) {
          logger.error("Failed to create audit event in middleware", {
            error: auditError instanceof Error ? auditError.message : String(auditError),
            method: propertyKey,
            className: target.constructor.name,
          });
          // Don't throw audit errors - they shouldn't break the main flow
        }
      }

      return result!;
    };

    return descriptor;
  };
}

/**
 * Manual audit helper for inline decision tracking
 */
export class AuditHelper {
  private auditService: AuditService;
  private context: AuditContext;

  constructor(context: AuditContext) {
    this.context = context;
    this.auditService = new AuditService(context.db);
  }

  /**
   * Track a decision with automatic timing
   */
  async trackDecision<T>(
    decisionInfo: DecisionInfo,
    operation: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let outcome: 'success' | 'failure' | 'partial' | 'skipped' = 'success';
    let error: Error | undefined;
    let result: T;

    try {
      result = await operation();
      outcome = 'success';
    } catch (err) {
      error = err instanceof Error ? err : new Error(String(err));
      outcome = 'failure';
      throw err;
    } finally {
      try {
        const duration = Date.now() - startTime;

        const auditInput: CreateAuditEventInput = {
          tenantId: this.context.tenantId,
          entityType: decisionInfo.entityType,
          entityId: decisionInfo.entityId,
          eventType: decisionInfo.eventType,
          decision: decisionInfo.decision,
          context: {
            ...decisionInfo.context,
            ...(error && {
              error: {
                message: error.message,
                stack: error.stack,
              }
            }),
          },
          outcome,
          correlationId: this.context.correlationId || uuidv4(),
          ...(decisionInfo.metadata !== undefined && { metadata: decisionInfo.metadata }),
          ...(decisionInfo.confidence !== undefined && { confidence: decisionInfo.confidence }),
          ...(duration !== undefined && { duration }),
          ...(decisionInfo.parentEventId !== undefined && { parentEventId: decisionInfo.parentEventId }),
          ...(this.context.userId !== undefined && { userId: this.context.userId }),
          ...(this.context.sessionId !== undefined && { sessionId: this.context.sessionId }),
        };

        await this.auditService.createEvent(auditInput);
      } catch (auditError) {
        logger.error("Failed to create audit event in helper", {
          error: auditError instanceof Error ? auditError.message : String(auditError),
          eventType: decisionInfo.eventType,
        });
      }
    }

    return result;
  }

  /**
   * Create a simple audit event without timing
   */
  async logDecision(decisionInfo: DecisionInfo): Promise<void> {
    try {
      const auditInput: CreateAuditEventInput = {
        tenantId: this.context.tenantId,
        entityType: decisionInfo.entityType,
        entityId: decisionInfo.entityId,
        eventType: decisionInfo.eventType,
        decision: decisionInfo.decision,
        outcome: 'success',
        correlationId: this.context.correlationId || uuidv4(),
        ...(decisionInfo.context !== undefined && { context: decisionInfo.context }),
        ...(decisionInfo.metadata !== undefined && { metadata: decisionInfo.metadata }),
        ...(decisionInfo.confidence !== undefined && { confidence: decisionInfo.confidence }),
        ...(decisionInfo.duration !== undefined && { duration: decisionInfo.duration }),
        ...(decisionInfo.parentEventId !== undefined && { parentEventId: decisionInfo.parentEventId }),
        ...(this.context.userId !== undefined && { userId: this.context.userId }),
        ...(this.context.sessionId !== undefined && { sessionId: this.context.sessionId }),
      };

      await this.auditService.createEvent(auditInput);
    } catch (error) {
      logger.error("Failed to log audit decision", {
        error: error instanceof Error ? error.message : String(error),
        eventType: decisionInfo.eventType,
      });
    }
  }

  /**
   * Create a child context for nested operations
   */
  createChildContext(_parentEventId: string): AuditHelper {
    return new AuditHelper({
      ...this.context,
      // Keep the same correlation ID for the chain
    });
  }

  /**
   * Get the underlying audit service
   */
  getService(): AuditService {
    return this.auditService;
  }
}

/**
 * Factory function to create audit helpers
 */
export function createAuditHelper(context: AuditContext): AuditHelper {
  return new AuditHelper(context);
}