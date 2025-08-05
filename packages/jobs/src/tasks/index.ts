// Explicit task exports to help Trigger.dev discovery
export { categorizeFile } from "./files/categorize-file";
export { generateThumbnail } from "./files/generate-thumbnail";
export { retryFailedFiles, scheduleFailedFilesRetry } from "./files/retry-failed-files";
export { cleanupOrphanedUploads, scheduleOrphanedUploadsCleanup } from "./files/cleanup-orphaned-uploads";
export { autoRecoverStuckFiles, scheduleStuckFilesRecovery } from "./files/auto-recover-stuck-files";
export { cleanupNonBusinessDocuments, cleanupAllNonBusinessDocuments } from "./files/cleanup-non-business-documents";
export { domainDiscovery } from "./suppliers/domain-discovery";
export { fetchLogo } from "./suppliers/fetch-logo";
export { processInvoiceSupplier } from "./suppliers/process-invoice-supplier";
export { websiteAnalysis } from "./suppliers/website-analysis";
export { syncEmailConnection } from "./email/sync-email-connection";
export { pollEmailConnections } from "./email/poll-email-connections";
