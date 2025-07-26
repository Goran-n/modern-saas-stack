import { globalSuppliers } from "@figgy/shared-db";
import { logger } from "@figgy/utils";
import { eq } from "drizzle-orm";
import { getDb } from "../db";

export interface LogoConfig {
  token: string;
  size?: number;
  format?: "png" | "webp";
}

export interface LogoResult {
  success: boolean;
  logoUrl?: string;
  error?: string;
}

export class LogoService {
  private config: LogoConfig;
  private baseUrl = "https://img.logo.dev";

  constructor(config?: Partial<LogoConfig>) {
    // In jobs context, use environment variable directly
    const logoDevToken = process.env.LOGO_DEV_TOKEN || "";
    
    this.config = {
      token: config?.token || logoDevToken,
      size: config?.size || 200,
      format: config?.format || "png",
    };

    if (!this.config.token) {
      logger.warn("Logo.dev token not configured");
    }
  }

  private get db() {
    return getDb();
  }

  /**
   * Fetch logo from logo.dev API
   */
  async fetchLogo(domain: string): Promise<LogoResult> {
    if (!this.config.token) {
      return {
        success: false,
        error: "Logo.dev token not configured",
      };
    }

    if (!domain) {
      return {
        success: false,
        error: "Domain is required",
      };
    }

    try {
      // Clean domain (remove protocol, www, path)
      const cleanDomain = this.cleanDomain(domain);
      
      // Construct logo URL with parameters
      const logoUrl = `${this.baseUrl}/${cleanDomain}?token=${this.config.token}&size=${this.config.size}&format=${this.config.format}&transparent=true`;

      // Logo.dev returns a default image even for domains without logos
      // So we'll just return the URL and let the frontend handle missing logos
      logger.info("Logo.dev API request", { 
        event: "logo_api_request",
        domain: cleanDomain,
        url: logoUrl,
        timestamp: new Date().toISOString(),
        // Add metrics for monitoring
        metrics: {
          api: "logo.dev",
          action: "fetch_logo",
          domain: cleanDomain,
        }
      });
      
      return {
        success: true,
        logoUrl,
      };
    } catch (error) {
      logger.error("Logo fetch error", { domain, error });
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Fetch and cache logo for a global supplier
   */
  async fetchAndCacheLogo(globalSupplierId: string): Promise<LogoResult> {
    // Get global supplier
    const [globalSupplier] = await this.db
      .select()
      .from(globalSuppliers)
      .where(eq(globalSuppliers.id, globalSupplierId));

    if (!globalSupplier) {
      return {
        success: false,
        error: "Global supplier not found",
      };
    }

    // Check if we should skip based on previous failures
    if (this.shouldSkipBasedOnFailures(globalSupplier)) {
      logger.info("Skipping logo fetch due to repeated failures", {
        globalSupplierId,
        attempts: globalSupplier.logoFetchAttempts,
        lastFailedAt: globalSupplier.logoLastFailedAt,
      });
      
      return {
        success: false,
        error: "Skipped due to repeated failures",
      };
    }

    if (!globalSupplier.primaryDomain) {
      // Update status to indicate no domain available
      await this.db
        .update(globalSuppliers)
        .set({
          logoFetchStatus: "not_found",
          logoFetchedAt: new Date(),
          logoFetchAttempts: (globalSupplier.logoFetchAttempts || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(globalSuppliers.id, globalSupplierId));

      return {
        success: false,
        error: "No domain available for supplier",
      };
    }

    // Fetch logo
    const result = await this.fetchLogo(globalSupplier.primaryDomain);

    // Update global supplier with result
    if (result.success && result.logoUrl) {
      await this.db
        .update(globalSuppliers)
        .set({
          logoUrl: result.logoUrl,
          logoFetchStatus: "success",
          logoFetchedAt: new Date(),
          logoFetchAttempts: (globalSupplier.logoFetchAttempts || 0) + 1,
          logoLastFailedAt: null, // Clear failure timestamp on success
          updatedAt: new Date(),
        })
        .where(eq(globalSuppliers.id, globalSupplierId));
    } else if (result.error === "Logo not found") {
      await this.db
        .update(globalSuppliers)
        .set({
          logoFetchStatus: "not_found",
          logoFetchedAt: new Date(),
          logoFetchAttempts: (globalSupplier.logoFetchAttempts || 0) + 1,
          updatedAt: new Date(),
        })
        .where(eq(globalSuppliers.id, globalSupplierId));
    } else {
      // API error or rate limit - mark as failed for retry
      await this.db
        .update(globalSuppliers)
        .set({
          logoFetchStatus: "failed",
          logoFetchedAt: new Date(),
          logoFetchAttempts: (globalSupplier.logoFetchAttempts || 0) + 1,
          logoLastFailedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(globalSuppliers.id, globalSupplierId));
    }

    return result;
  }

  /**
   * Check if we should skip fetching based on previous failures
   */
  private shouldSkipBasedOnFailures(globalSupplier: any): boolean {
    const attempts = globalSupplier.logoFetchAttempts || 0;
    const lastFailedAt = globalSupplier.logoLastFailedAt;
    
    // Skip if we've tried more than 5 times
    if (attempts >= 5) {
      // But allow retry after 30 days
      if (lastFailedAt) {
        const daysSinceLastFailure = (Date.now() - new Date(lastFailedAt).getTime()) / (24 * 60 * 60 * 1000);
        return daysSinceLastFailure < 30;
      }
      return true;
    }
    
    // For fewer attempts, use exponential backoff
    if (lastFailedAt && attempts > 0) {
      const hoursSinceLastFailure = (Date.now() - new Date(lastFailedAt).getTime()) / (60 * 60 * 1000);
      const backoffHours = Math.pow(2, attempts - 1) * 24; // 1 day, 2 days, 4 days, 8 days
      
      return hoursSinceLastFailure < backoffHours;
    }
    
    return false;
  }

  /**
   * Check if logo needs refresh
   */
  needsRefresh(fetchedAt: Date | null, status: string, attempts?: number): boolean {
    if (!fetchedAt) return true;

    const age = Date.now() - fetchedAt.getTime();
    const dayInMs = 24 * 60 * 60 * 1000;

    switch (status) {
      case "success":
        // Refresh successful logos after 30 days
        return age > 30 * dayInMs;
      case "not_found":
        // Retry not found logos after 90 days
        return age > 90 * dayInMs;
      case "failed":
        // Use exponential backoff for failed attempts
        if (attempts && attempts > 0) {
          const backoffDays = Math.pow(2, Math.min(attempts - 1, 4)); // Cap at 16 days
          return age > backoffDays * dayInMs;
        }
        // Default to retry after 24 hours
        return age > dayInMs;
      default:
        return true;
    }
  }

  /**
   * Clean domain for logo.dev API
   */
  private cleanDomain(domain: string): string {
    // Remove protocol
    let clean = domain.replace(/^https?:\/\//, "");
    
    // Remove www
    clean = clean.replace(/^www\./, "");
    
    // Remove path and query
    const parts = clean.split("/");
    clean = parts[0] || clean;
    
    const queryParts = clean.split("?");
    clean = queryParts[0] || clean;
    
    // Remove port
    const portParts = clean.split(":");
    clean = portParts[0] || clean;
    
    return clean.toLowerCase().trim();
  }
}