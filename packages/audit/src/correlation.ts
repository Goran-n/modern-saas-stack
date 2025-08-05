import { v4 as uuidv4 } from "uuid";
import { createLogger } from "@figgy/utils";

const logger = createLogger("audit-correlation");

/**
 * Correlation ID context for tracking related operations across services
 */
export interface CorrelationContext {
  correlationId: string;
  parentEventId?: string;
  rootEventId?: string;
  tenantId: string;
  userId?: string;
  sessionId?: string;
  source: 'user' | 'system' | 'webhook' | 'job' | 'cron';
  metadata?: Record<string, any>;
}

/**
 * Correlation manager for creating and managing correlation contexts
 */
export class CorrelationManager {
  private static instance: CorrelationManager;
  private correlationStack: CorrelationContext[] = [];

  private constructor() {}

  /**
   * Get singleton instance
   */
  static getInstance(): CorrelationManager {
    if (!CorrelationManager.instance) {
      CorrelationManager.instance = new CorrelationManager();
    }
    return CorrelationManager.instance;
  }

  /**
   * Create a new correlation context
   */
  createContext(params: {
    tenantId: string;
    userId?: string;
    sessionId?: string;
    source: 'user' | 'system' | 'webhook' | 'job' | 'cron';
    parentEventId?: string;
    rootEventId?: string;
    correlationId?: string;
    metadata?: Record<string, any>;
  }): CorrelationContext {
    const context = {
      correlationId: params.correlationId || uuidv4(),
      tenantId: params.tenantId,
      source: params.source,
      ...(params.parentEventId !== undefined && { parentEventId: params.parentEventId }),
      ...(params.rootEventId !== undefined || params.parentEventId !== undefined 
        ? { rootEventId: params.rootEventId || params.parentEventId } 
        : {}),
      ...(params.userId !== undefined && { userId: params.userId }),
      ...(params.sessionId !== undefined && { sessionId: params.sessionId }),
      ...(params.metadata !== undefined && { metadata: params.metadata }),
    } as CorrelationContext;

    logger.debug("Created correlation context", {
      correlationId: context.correlationId,
      parentEventId: context.parentEventId,
      rootEventId: context.rootEventId,
      source: context.source,
      tenantId: context.tenantId,
    });

    return context;
  }

  /**
   * Create a child context from an existing one
   */
  createChildContext(
    parent: CorrelationContext,
    params?: {
      parentEventId?: string;
      metadata?: Record<string, any>;
    }
  ): CorrelationContext {
    const childContext: CorrelationContext = {
      correlationId: parent.correlationId,
      tenantId: parent.tenantId,
      source: parent.source,
      rootEventId: parent.rootEventId || parent.correlationId,
      ...(params?.parentEventId !== undefined ? { parentEventId: params.parentEventId } : 
          parent.parentEventId !== undefined ? { parentEventId: parent.parentEventId } : {}),
      ...(parent.userId !== undefined && { userId: parent.userId }),
      ...(parent.sessionId !== undefined && { sessionId: parent.sessionId }),
      ...(parent.metadata !== undefined || params?.metadata !== undefined 
        ? { metadata: { ...parent.metadata, ...params?.metadata } } 
        : {}),
    };
    return childContext;
  }

  /**
   * Push a correlation context onto the stack
   */
  pushContext(context: CorrelationContext): void {
    this.correlationStack.push(context);
    logger.debug("Pushed correlation context", {
      correlationId: context.correlationId,
      stackDepth: this.correlationStack.length,
    });
  }

  /**
   * Pop the current correlation context from the stack
   */
  popContext(): CorrelationContext | undefined {
    const context = this.correlationStack.pop();
    if (context) {
      logger.debug("Popped correlation context", {
        correlationId: context.correlationId,
        stackDepth: this.correlationStack.length,
      });
    }
    return context;
  }

  /**
   * Get the current correlation context
   */
  getCurrentContext(): CorrelationContext | undefined {
    return this.correlationStack[this.correlationStack.length - 1];
  }

  /**
   * Execute a function within a correlation context
   */
  async withContext<T>(
    context: CorrelationContext,
    fn: (context: CorrelationContext) => Promise<T>
  ): Promise<T> {
    this.pushContext(context);
    try {
      return await fn(context);
    } finally {
      this.popContext();
    }
  }

  /**
   * Generate a correlation ID for external systems
   */
  generateCorrelationId(): string {
    return uuidv4();
  }

  /**
   * Parse correlation ID from headers or other sources
   */
  parseCorrelationId(headers: Record<string, string | string[] | undefined>): string | undefined {
    const correlationId = 
      headers['x-correlation-id'] ||
      headers['x-request-id'] ||
      headers['correlation-id'] ||
      headers['request-id'];

    if (Array.isArray(correlationId)) {
      return correlationId[0];
    }

    return correlationId;
  }

  /**
   * Create correlation headers for outgoing requests
   */
  createHeaders(context: CorrelationContext): Record<string, string> {
    return {
      'x-correlation-id': context.correlationId,
      'x-tenant-id': context.tenantId,
      ...(context.userId && { 'x-user-id': context.userId }),
      ...(context.sessionId && { 'x-session-id': context.sessionId }),
      'x-source': context.source,
    };
  }

  /**
   * Clear the correlation stack (useful for testing)
   */
  clearStack(): void {
    this.correlationStack = [];
    logger.debug("Cleared correlation stack");
  }
}

/**
 * Correlation decorator for automatic context management
 */
export function withCorrelation<T extends any[], R>(
  createContext: (...args: T) => CorrelationContext
) {
  return function (
    _target: any,
    _propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: T): Promise<R> {
      const correlationManager = CorrelationManager.getInstance();
      const context = createContext(...args);

      return await correlationManager.withContext(context, async () => {
        return await originalMethod.apply(this, args);
      });
    };

    return descriptor;
  };
}

/**
 * Express middleware for correlation tracking
 */
export function correlationMiddleware() {
  return (req: any, res: any, next: any) => {
    const correlationManager = CorrelationManager.getInstance();
    
    // Try to get correlation ID from headers
    let correlationId = correlationManager.parseCorrelationId(req.headers);
    
    // Generate new one if not provided
    if (!correlationId) {
      correlationId = correlationManager.generateCorrelationId();
    }

    // Create context (will be populated by auth middleware)
    const context: CorrelationContext = {
      correlationId,
      tenantId: req.tenantId || 'unknown',
      userId: req.userId,
      sessionId: req.sessionId,
      source: 'user',
      metadata: {
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        method: req.method,
        path: req.path,
      },
    };

    // Add to request for downstream use
    req.correlationContext = context;
    
    // Add correlation ID to response headers
    res.setHeader('x-correlation-id', correlationId);

    // Push context for the duration of the request
    correlationManager.pushContext(context);

    // Clean up on response finish
    res.on('finish', () => {
      correlationManager.popContext();
    });

    next();
  };
}

/**
 * TRPC middleware for correlation tracking
 */
export function trpcCorrelationMiddleware() {
  return async (opts: any) => {
    const correlationManager = CorrelationManager.getInstance();
    
    // Get correlation ID from context or generate new one
    let correlationId = opts.ctx.correlationId;
    if (!correlationId) {
      correlationId = correlationManager.generateCorrelationId();
    }

    // Create context
    const context: CorrelationContext = {
      correlationId,
      tenantId: opts.ctx.tenant?.id || 'unknown',
      userId: opts.ctx.user?.id,
      sessionId: opts.ctx.sessionId,
      source: 'user',
      metadata: {
        procedure: opts.path,
        type: opts.type,
      },
    };

    // Execute within context
    return await correlationManager.withContext(context, async () => {
      return await opts.next({
        ctx: {
          ...opts.ctx,
          correlationContext: context,
        },
      });
    });
  };
}

/**
 * Job/task correlation helper
 */
export function createJobCorrelationContext(params: {
  tenantId: string;
  jobId: string;
  jobType: string;
  triggeredBy?: 'user' | 'system' | 'cron';
  parentCorrelationId?: string;
  metadata?: Record<string, any>;
}): CorrelationContext {
  const correlationManager = CorrelationManager.getInstance();
  
  return correlationManager.createContext({
    tenantId: params.tenantId,
    source: 'job',
    ...(params.parentCorrelationId !== undefined && { correlationId: params.parentCorrelationId }),
    metadata: {
      jobId: params.jobId,
      jobType: params.jobType,
      triggeredBy: params.triggeredBy || 'system',
      ...params.metadata,
    },
  });
}

/**
 * Webhook correlation helper
 */
export function createWebhookCorrelationContext(params: {
  tenantId: string;
  webhookSource: string;
  eventType: string;
  externalId?: string;
  metadata?: Record<string, any>;
}): CorrelationContext {
  const correlationManager = CorrelationManager.getInstance();
  
  return correlationManager.createContext({
    tenantId: params.tenantId,
    source: 'webhook',
    metadata: {
      webhookSource: params.webhookSource,
      eventType: params.eventType,
      externalId: params.externalId,
      ...params.metadata,
    },
  });
}

// Export singleton instance for convenience
export const correlationManager = CorrelationManager.getInstance();