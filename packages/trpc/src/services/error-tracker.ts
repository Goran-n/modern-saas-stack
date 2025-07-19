import { logger } from "@kibly/utils";
import { TRPCError } from "@trpc/server";

export interface ErrorMetrics {
  totalErrors: number;
  errorsByCode: Record<string, number>;
  errorsByPath: Record<string, number>;
  recentErrors: ErrorDetails[];
}

export interface ErrorDetails {
  errorId: string;
  timestamp: number;
  code: string;
  message: string;
  path?: string | undefined;
  userId?: string | undefined;
  tenantId?: string | undefined;
  requestId?: string | undefined;
  stack?: string | undefined;
}

class ErrorTracker {
  private errors: ErrorDetails[] = [];
  private errorCounts = {
    byCode: new Map<string, number>(),
    byPath: new Map<string, number>(),
    total: 0,
  };
  private readonly maxRecentErrors = 100;
  private readonly errorRateWindow = 60 * 1000; // 1 minute

  trackError(
    error: TRPCError | Error,
    context: {
      path?: string | undefined;
      userId?: string | undefined;
      tenantId?: string | undefined;
      requestId?: string | undefined;
    },
  ): string {
    const errorId = crypto.randomUUID();
    const timestamp = Date.now();

    const errorDetails: ErrorDetails = {
      errorId,
      timestamp,
      code: error instanceof TRPCError ? error.code : "INTERNAL_SERVER_ERROR",
      message: error.message,
      path: context.path,
      userId: context.userId,
      tenantId: context.tenantId,
      requestId: context.requestId,
      stack: error.stack,
    };

    // Track error
    this.errors.push(errorDetails);
    this.errorCounts.total++;

    // Update error counts by code
    const currentCodeCount =
      this.errorCounts.byCode.get(errorDetails.code) || 0;
    this.errorCounts.byCode.set(errorDetails.code, currentCodeCount + 1);

    // Update error counts by path
    if (context.path) {
      const currentPathCount = this.errorCounts.byPath.get(context.path) || 0;
      this.errorCounts.byPath.set(context.path, currentPathCount + 1);
    }

    // Maintain max recent errors
    if (this.errors.length > this.maxRecentErrors) {
      this.errors = this.errors.slice(-this.maxRecentErrors);
    }

    // Check error rate
    this.checkErrorRate();

    return errorId;
  }

  private checkErrorRate(): void {
    const now = Date.now();
    const recentErrors = this.errors.filter(
      (e) => e.timestamp > now - this.errorRateWindow,
    );

    // Alert if error rate is high
    if (recentErrors.length > 10) {
      logger.warn("High error rate detected", {
        errorCount: recentErrors.length,
        window: `${this.errorRateWindow / 1000}s`,
        errorCodes: this.getErrorCodeDistribution(recentErrors),
      });
    }

    // Alert on specific error patterns
    const authErrors = recentErrors.filter((e) => e.code === "UNAUTHORIZED");
    if (authErrors.length > 5) {
      logger.warn("Multiple authentication failures detected", {
        count: authErrors.length,
        userIds: [...new Set(authErrors.map((e) => e.userId).filter(Boolean))],
      });
    }
  }

  private getErrorCodeDistribution(
    errors: ErrorDetails[],
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    errors.forEach((error) => {
      distribution[error.code] = (distribution[error.code] || 0) + 1;
    });

    return distribution;
  }

  getMetrics(): ErrorMetrics {
    const now = Date.now();
    const recentErrors = this.errors.filter(
      (e) => e.timestamp > now - 5 * 60 * 1000, // Last 5 minutes
    );

    return {
      totalErrors: this.errorCounts.total,
      errorsByCode: Object.fromEntries(this.errorCounts.byCode),
      errorsByPath: Object.fromEntries(this.errorCounts.byPath),
      recentErrors: recentErrors.slice(-20), // Last 20 errors
    };
  }

  getErrorDetails(errorId: string): ErrorDetails | undefined {
    return this.errors.find((e) => e.errorId === errorId);
  }

  clearOldErrors(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours
    this.errors = this.errors.filter((e) => e.timestamp > cutoff);
  }
}

// Singleton instance
export const errorTracker = new ErrorTracker();

// Clean up old errors every hour
if (typeof setInterval !== "undefined") {
  setInterval(
    () => {
      errorTracker.clearOldErrors();
    },
    60 * 60 * 1000,
  );
}
