import { getConfig } from "@kibly/config";
import {
  type CompanyProfile,
  documentExtractions,
  getDatabaseConnection,
} from "@kibly/shared-db";
import { eq } from "drizzle-orm";
import {
  CONFIDENCE_SCORES,
  extractVendorData,
  PROCESSING_NOTES,
  SupplierIngestionService,
  transformInvoiceToSupplier,
} from "@kibly/supplier";
import { logger } from "@kibly/utils";
import { task } from "@trigger.dev/sdk/v3";
import { z } from "zod";

// Input schema for the task
const processInvoiceSupplierSchema = z.object({
  documentExtractionId: z.string().uuid(),
  tenantId: z.string().uuid(),
  userId: z.string().uuid().optional(),
});

export type ProcessInvoiceSupplierInput = z.infer<
  typeof processInvoiceSupplierSchema
>;

export const processInvoiceSupplier = task({
  id: "process-invoice-supplier",
  // Use tenant-based concurrency to prevent race conditions
  queue: {
    concurrencyLimit: 1, // Will be overridden by concurrencyKey
  },
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
    randomize: true,
  },
  run: async (payload: ProcessInvoiceSupplierInput) => {
    const { documentExtractionId, tenantId, userId } = payload;

    logger.info("Processing invoice supplier", {
      documentExtractionId,
      tenantId,
    });

    try {
      // Initialize database
      getConfig().validate();
      const config = getConfig().getCore();
      const db = getDatabaseConnection(config.DATABASE_URL);

      // Use transaction for entire operation to ensure data consistency
      return await db.transaction(async (tx) => {
        // Get document extraction data
        const [extraction] = await tx
          .select()
          .from(documentExtractions)
          .where(eq(documentExtractions.id, documentExtractionId))
          .limit(1);

        if (!extraction) {
          throw new Error(
            `Document extraction not found: ${documentExtractionId}`,
          );
        }

        // Only process invoices, receipts, and purchase orders
        if (
          !["invoice", "receipt", "purchase_order"].includes(
            extraction.documentType || "",
          )
        ) {
          logger.info("Skipping non-invoice document type", {
            documentType: extraction.documentType,
          });
          return {
            skipped: true,
            reason: "Not an invoice-type document",
          };
        }

        // Transform extraction data to supplier format
        // Extract vendor data from JSONB fields using helper
        const vendorData = extractVendorData(extraction.extractedFields);
        const supplierRequest = transformInvoiceToSupplier(
          {
            id: extraction.id,
            vendorData,
            companyProfile: extraction.companyProfile as CompanyProfile | null,
          },
          tenantId,
          userId,
        );

        if (!supplierRequest) {
          logger.warn("Could not transform invoice to supplier", {
            documentExtractionId,
            vendorName: vendorData.name,
          });

          // Update extraction with no match
          await tx
            .update(documentExtractions)
            .set({
              matchedSupplierId: null,
              matchConfidence: CONFIDENCE_SCORES.INSUFFICIENT_DATA,
              processingNotes: PROCESSING_NOTES.INSUFFICIENT_DATA,
            })
            .where(eq(documentExtractions.id, documentExtractionId));

          return {
            skipped: true,
            reason: "Insufficient supplier data",
          };
        }

        // Process supplier using ingestion service
        // Note: Since we're using singleton pattern, we'll need to handle transactions differently
        const ingestionService = new SupplierIngestionService();
        const result = await ingestionService.ingest(supplierRequest);

        if (result.success && result.supplierId) {
          // Update document extraction with matched supplier
          await tx
            .update(documentExtractions)
            .set({
              matchedSupplierId: result.supplierId,
              matchConfidence:
                result.action === "created"
                  ? CONFIDENCE_SCORES.SUPPLIER_CREATED
                  : CONFIDENCE_SCORES.SUPPLIER_MATCHED,
              processingNotes:
                result.action === "created"
                  ? PROCESSING_NOTES.SUPPLIER_CREATED
                  : PROCESSING_NOTES.SUPPLIER_MATCHED,
            })
            .where(eq(documentExtractions.id, documentExtractionId));

          logger.info("Supplier processing completed", {
            documentExtractionId,
            supplierId: result.supplierId,
            action: result.action,
          });

          return {
            success: true,
            supplierId: result.supplierId,
            action: result.action,
          };
        } else {
          // Handle failure
          await tx
            .update(documentExtractions)
            .set({
              matchedSupplierId: null,
              matchConfidence: CONFIDENCE_SCORES.NO_MATCH,
              processingNotes:
                result.error || PROCESSING_NOTES.VALIDATION_FAILED,
            })
            .where(eq(documentExtractions.id, documentExtractionId));

          // If it's a validation error, we should throw so the task is marked as failed
          // This allows for proper error handling and potential retries
          const errorMessage = `Supplier processing failed: ${result.error}`;
          logger.error(errorMessage, {
            documentExtractionId,
            error: result.error,
          });

          throw new Error(errorMessage);
        }
      });
    } catch (error) {
      logger.error("Error processing invoice supplier", {
        error,
        documentExtractionId,
      });

      // Update extraction with error
      try {
        const config = getConfig();
        const db = getDatabaseConnection(config.getCore().DATABASE_URL);
        await db
          .update(documentExtractions)
          .set({
            processingNotes: `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          })
          .where(eq(documentExtractions.id, documentExtractionId));
      } catch (updateError) {
        logger.error("Failed to update extraction with error", { updateError });
      }

      throw error;
    }
  },
});
