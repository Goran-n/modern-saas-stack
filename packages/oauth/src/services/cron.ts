import { CronJob } from "cron";
import { getOAuthTokenManager } from "./token-manager";

/**
 * OAuth maintenance cron jobs
 */
export class OAuthCronService {
  private tokenManager = getOAuthTokenManager();
  private jobs: CronJob[] = [];

  /**
   * Start all OAuth maintenance jobs
   */
  start(): void {
    // Refresh expiring tokens every 5 minutes
    const tokenRefreshJob = new CronJob("*/5 * * * *", async () => {
      try {
        console.log("[OAuth] Starting token refresh job");
        const result = await this.tokenManager.refreshExpiringTokens();
        console.log(
          `[OAuth] Token refresh completed: ${result.refreshed.length} refreshed, ${result.failed.length} failed`,
        );
      } catch (error) {
        console.error("[OAuth] Token refresh job failed:", error);
      }
    });

    // Renew expiring webhooks every hour
    const webhookRenewalJob = new CronJob("0 * * * *", async () => {
      try {
        console.log("[OAuth] Starting webhook renewal job");
        const result = await this.tokenManager.renewExpiringWebhooks();
        console.log(
          `[OAuth] Webhook renewal completed: ${result.renewed.length} renewed, ${result.failed.length} failed`,
        );
      } catch (error) {
        console.error("[OAuth] Webhook renewal job failed:", error);
      }
    });

    // Clean up expired connections daily at 3 AM
    const cleanupJob = new CronJob("0 3 * * *", async () => {
      try {
        console.log("[OAuth] Starting cleanup job");
        const result = await this.tokenManager.cleanupExpiredConnections();
        console.log(
          `[OAuth] Cleanup completed: ${result.deleted} connections deleted`,
        );
      } catch (error) {
        console.error("[OAuth] Cleanup job failed:", error);
      }
    });

    // Start all jobs
    this.jobs = [tokenRefreshJob, webhookRenewalJob, cleanupJob];
    this.jobs.forEach((job) => job.start());

    console.log("[OAuth] Cron jobs started");
  }

  /**
   * Stop all OAuth maintenance jobs
   */
  stop(): void {
    this.jobs.forEach((job) => job.stop());
    this.jobs = [];
    console.log("[OAuth] Cron jobs stopped");
  }

  /**
   * Get job status
   */
  getStatus(): Array<{
    name: string;
    running: boolean;
    nextExecution: Date | null;
  }> {
    const jobNames = ["Token Refresh", "Webhook Renewal", "Cleanup"];
    
    return this.jobs.map((job, index) => ({
      name: jobNames[index] || "Unknown",
      running: job.running,
      nextExecution: job.running ? job.nextDate().toJSDate() : null,
    }));
  }
}

// Singleton instance
let cronService: OAuthCronService | null = null;

/**
 * Get the OAuth cron service instance
 */
export function getOAuthCronService(): OAuthCronService {
  if (!cronService) {
    cronService = new OAuthCronService();
  }
  return cronService;
}