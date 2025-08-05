import { getConfig } from "@figgy/config";
import { globalSuppliers, eq, inArray } from "@figgy/shared-db";
import { LogoService } from "@figgy/supplier";
import { logger } from "@figgy/utils";
import { task } from "@trigger.dev/sdk/v3";
import { getDb } from "../../db";

// Rate limiting configuration
const RATE_LIMIT_CONFIG = {
  maxRequestsPerMinute: 30,
  initialDelayMs: 100,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

class RateLimiter {
  private requestTimes: number[] = [];
  private currentDelay = RATE_LIMIT_CONFIG.initialDelayMs;

  get getCurrentDelay(): number {
    return this.currentDelay;
  }

  async waitIfNeeded(): Promise<void> {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Clean up old request times
    this.requestTimes = this.requestTimes.filter((time) => time > oneMinuteAgo);

    // Check if we're at the rate limit
    if (this.requestTimes.length >= RATE_LIMIT_CONFIG.maxRequestsPerMinute) {
      const oldestRequest = this.requestTimes[0];
      if (!oldestRequest) {
        throw new Error("Unexpected undefined oldest request");
      }
      const waitTime = Math.max(0, oldestRequest + 60000 - now);

      logger.info("Rate limit reached, waiting", {
        waitTimeMs: waitTime,
        requestsInWindow: this.requestTimes.length,
      });

      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }

    // Add current request time
    this.requestTimes.push(now);

    // Apply delay
    await new Promise((resolve) => setTimeout(resolve, this.currentDelay));
  }

  increaseDelay(): void {
    this.currentDelay = Math.min(
      this.currentDelay * RATE_LIMIT_CONFIG.backoffMultiplier,
      RATE_LIMIT_CONFIG.maxDelayMs,
    );

    logger.info("Increased rate limit delay", {
      newDelayMs: this.currentDelay,
    });
  }

  resetDelay(): void {
    this.currentDelay = RATE_LIMIT_CONFIG.initialDelayMs;
  }
}

export const fetchLogo = task({
  id: "fetch-logo",
  maxDuration: 300, // 5 minutes
  run: async (payload: { globalSupplierIds: string[] }) => {
    const { globalSupplierIds } = payload;

    if (!globalSupplierIds || globalSupplierIds.length === 0) {
      logger.warn("No supplier IDs provided for logo fetch");
      return {
        success: true,
        processed: 0,
        results: [],
      };
    }

    // Validate configuration
    getConfig().validate();

    const db = getDb();
    const logoService = new LogoService();
    const rateLimiter = new RateLimiter();

    logger.info("Starting logo fetch task", {
      supplierCount: globalSupplierIds.length,
    });

    const results = {
      success: 0,
      notFound: 0,
      failed: 0,
      skipped: 0,
      rateLimited: 0,
    };

    const detailedResults = [];

    try {
      // Get all suppliers in batch
      const suppliers = await db
        .select()
        .from(globalSuppliers)
        .where(inArray(globalSuppliers.id, globalSupplierIds));

      logger.info("Found suppliers for logo fetch", {
        requested: globalSupplierIds.length,
        found: suppliers.length,
      });

      // Process each supplier
      for (const supplier of suppliers) {
        try {
          // Check if logo fetch is needed
          if (
            !logoService.needsRefresh(
              supplier.logoFetchedAt,
              supplier.logoFetchStatus,
              0, // logoFetchAttempts column doesn't exist
            )
          ) {
            logger.debug("Logo fetch not needed", {
              globalSupplierId: supplier.id,
              status: supplier.logoFetchStatus,
              attempts: 0,
            });
            results.skipped++;
            detailedResults.push({
              globalSupplierId: supplier.id,
              status: "skipped",
              reason: "Logo is up to date",
            });
            continue;
          }

          // Check if supplier has a domain
          if (!supplier.primaryDomain) {
            logger.info("No domain available for supplier", {
              globalSupplierId: supplier.id,
              name: supplier.canonicalName,
            });

            // Update status to indicate no domain
            await db
              .update(globalSuppliers)
              .set({
                logoFetchStatus: "not_found",
                logoFetchedAt: new Date(),
                updatedAt: new Date(),
              })
              .where(eq(globalSuppliers.id, supplier.id));

            results.notFound++;
            detailedResults.push({
              globalSupplierId: supplier.id,
              status: "no_domain",
              reason: "No domain available",
            });
            continue;
          }

          // Apply rate limiting before making request
          await rateLimiter.waitIfNeeded();

          // Fetch and cache the logo
          const result = await logoService.fetchAndCacheLogo(supplier.id);

          if (result.success) {
            results.success++;
            detailedResults.push({
              globalSupplierId: supplier.id,
              status: "success",
              logoUrl: result.logoUrl,
            });
            // Reset delay on success
            rateLimiter.resetDelay();
          } else if (result.error === "Logo not found") {
            results.notFound++;
            detailedResults.push({
              globalSupplierId: supplier.id,
              status: "not_found",
              error: result.error,
            });
          } else if (
            result.error === "Rate limit exceeded" ||
            result.error?.includes("429")
          ) {
            results.rateLimited++;
            detailedResults.push({
              globalSupplierId: supplier.id,
              status: "rate_limited",
              error: result.error,
            });
            // Increase delay on rate limit
            rateLimiter.increaseDelay();

            // Continue processing with backoff instead of stopping
            logger.warn("Rate limit hit, continuing with backoff", {
              currentDelay: rateLimiter.getCurrentDelay,
              remainingSuppliers:
                suppliers.length - suppliers.indexOf(supplier) - 1,
            });
          } else {
            results.failed++;
            detailedResults.push({
              globalSupplierId: supplier.id,
              status: "failed",
              error: result.error,
            });
            // Increase delay on failure as well
            rateLimiter.increaseDelay();
          }
        } catch (error) {
          logger.error("Failed to fetch logo for supplier", {
            supplierId: supplier.id,
            domain: supplier.primaryDomain,
            error,
          });
          results.failed++;
          detailedResults.push({
            globalSupplierId: supplier.id,
            status: "error",
            error: error instanceof Error ? error.message : "Unknown error",
          });
        }
      }

      // Handle missing suppliers
      const foundIds = new Set(suppliers.map((s) => s.id));
      const missingIds = globalSupplierIds.filter((id) => !foundIds.has(id));

      if (missingIds.length > 0) {
        logger.warn("Some supplier IDs were not found", { missingIds });
        for (const id of missingIds) {
          detailedResults.push({
            globalSupplierId: id,
            status: "not_found",
            error: "Global supplier not found",
          });
        }
      }

      logger.info("Logo fetch task completed", {
        event: "logo_fetch_task_completed",
        ...results,
        total: globalSupplierIds.length,
        timestamp: new Date().toISOString(),
        // Metrics for monitoring API usage
        metrics: {
          api: "logo.dev",
          task: "fetch-logo",
          requests_made: results.success + results.notFound + results.failed,
          successful_fetches: results.success,
          cost_estimate: `$${((results.success + results.notFound + results.failed) * 0.001).toFixed(3)}`, // Assuming $0.001 per request
        },
      });

      // Consider the job failed if all items failed
      const success =
        results.success > 0 ||
        results.notFound > 0 ||
        results.skipped > 0 ||
        (results.failed === 0 &&
          results.rateLimited === 0 &&
          suppliers.length === 0);

      if (!success) {
        const errorMessage = `Logo fetch failed for all ${results.failed + results.rateLimited} supplier(s)`;
        logger.error(errorMessage, {
          stats: results,
          failedSuppliers: detailedResults.filter(
            (r) =>
              r.status === "failed" ||
              r.status === "error" ||
              r.status === "rate_limited",
          ),
        });
        throw new Error(errorMessage);
      }

      return {
        success,
        processed: suppliers.length,
        stats: results,
        results: detailedResults,
      };
    } catch (error) {
      logger.error("Logo fetch task failed", {
        error: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      });
      throw error;
    }
  },
});

// Export a function to manually trigger the task
export async function triggerLogoFetch(globalSupplierIds: string[]) {
  return await fetchLogo.trigger({ globalSupplierIds });
}
