import { getOAuthCronService } from "@figgy/oauth";
import { logger } from "@figgy/utils";

let cronService: ReturnType<typeof getOAuthCronService> | null = null;

/**
 * Start OAuth maintenance worker
 */
export function startOAuthWorker(): void {
  try {
    cronService = getOAuthCronService();
    cronService.start();
    logger.info("OAuth maintenance worker started");
  } catch (error) {
    logger.error("Failed to start OAuth worker", { error });
  }
}

/**
 * Stop OAuth maintenance worker
 */
export function stopOAuthWorker(): void {
  if (cronService) {
    cronService.stop();
    logger.info("OAuth maintenance worker stopped");
  }
}

/**
 * Get OAuth worker status
 */
export function getOAuthWorkerStatus() {
  if (!cronService) {
    return { running: false, jobs: [] };
  }
  
  return {
    running: true,
    jobs: cronService.getStatus(),
  };
}