import { 
  and,
  eq,
  lt,
  emailConnections,
  EmailProvider,
} from "@figgy/shared-db";
import { createLogger } from "@figgy/utils";
import { schedules, tasks } from "@trigger.dev/sdk/v3";
import { getDb } from "../../db";

const logger = createLogger("poll-email-connections");

// Poll intervals by provider (in minutes)
const POLL_INTERVALS = {
  gmail: 5,    // Gmail with Pub/Sub should rarely need polling
  outlook: 5,  // Outlook with webhooks should rarely need polling  
  imap: 10,    // IMAP requires polling
};

export const pollEmailConnections = schedules.task({
  id: "poll-email-connections",
  cron: "*/5 * * * *", // Run every 5 minutes
  run: async () => {
    const db = getDb();
    
    logger.info("Starting email connection polling");
    
    try {
      const now = new Date();
      const connections = await db
        .select()
        .from(emailConnections)
        .where(eq(emailConnections.status, "active"));
      
      logger.info("Found active connections", {
        count: connections.length,
      });
      
      const syncJobs: Array<{ connectionId: string; provider: string }> = [];
      
      for (const connection of connections) {
        // Check if connection needs polling based on provider
        const pollInterval = POLL_INTERVALS[connection.provider as keyof typeof POLL_INTERVALS];
        
        if (!pollInterval) {
          logger.warn("Unknown provider poll interval", {
            provider: connection.provider,
          });
          continue;
        }
        
        // Skip if recently synced
        if (connection.lastSyncAt) {
          const minutesSinceSync = 
            (now.getTime() - connection.lastSyncAt.getTime()) / (1000 * 60);
          
          if (minutesSinceSync < pollInterval) {
            logger.debug("Skipping recently synced connection", {
              connectionId: connection.id,
              minutesSinceSync,
              pollInterval,
            });
            continue;
          }
        }
        
        // Skip if webhooks are active for Gmail/Outlook
        if (
          (connection.provider === "gmail" || connection.provider === "outlook") &&
          connection.webhookSubscriptionId &&
          connection.webhookExpiresAt &&
          connection.webhookExpiresAt > now
        ) {
          logger.debug("Skipping connection with active webhook", {
            connectionId: connection.id,
            webhookExpires: connection.webhookExpiresAt,
          });
          continue;
        }
        
        syncJobs.push({
          connectionId: connection.id,
          provider: connection.provider,
        });
      }
      
      logger.info("Triggering sync jobs", {
        count: syncJobs.length,
      });
      
      // Trigger sync jobs
      const results = await Promise.allSettled(
        syncJobs.map(job =>
          tasks.trigger("sync-email-connection", {
            connectionId: job.connectionId,
            triggeredBy: "schedule",
          })
        )
      );
      
      const successful = results.filter(r => r.status === "fulfilled").length;
      const failed = results.filter(r => r.status === "rejected").length;
      
      logger.info("Email connection polling completed", {
        total: syncJobs.length,
        successful,
        failed,
      });
      
      return {
        connectionsChecked: connections.length,
        jobsTriggered: syncJobs.length,
        successful,
        failed,
      };
    } catch (error) {
      logger.error("Email connection polling failed", { error });
      throw error;
    }
  },
});