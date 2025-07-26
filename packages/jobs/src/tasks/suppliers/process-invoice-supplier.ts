import { getConfig } from "@figgy/config";
import { generateDisplayName } from "@figgy/file-manager";
import * as searchOps from "@figgy/search";
import {
  type CompanyProfile,
  documentExtractions,
  eq,
  files as filesTable,
  getDatabaseConnection,
  suppliers,
} from "@figgy/shared-db";
import {
  CONFIDENCE_SCORES,
  extractVendorDataWithConfidence,
  PROCESSING_NOTES,
  SupplierIngestionService,
  transformInvoiceToSupplier,
} from "@figgy/supplier";
import { logger } from "@figgy/utils";
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
        // Extract vendor data from JSONB fields using helper with confidence scores
        const vendorData = extractVendorDataWithConfidence(extraction.extractedFields);
        const supplierRequest = transformInvoiceToSupplier(
          {
            id: extraction.id,
            vendorData,
            companyProfile: extraction.companyProfile as CompanyProfile | null,
            extractedFields: extraction.extractedFields,
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

        // Handle successful creation or update
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

          // Update file's display name with supplier information
          const [supplier] = await tx
            .select()
            .from(suppliers)
            .where(eq(suppliers.id, result.supplierId))
            .limit(1);

          if (supplier && extraction.fileId) {
            const [file] = await tx
              .select()
              .from(filesTable)
              .where(eq(filesTable.id, extraction.fileId))
              .limit(1);

            if (file) {
              const fileExtension = file.fileName.substring(
                file.fileName.lastIndexOf("."),
              );
              const displayName = generateDisplayName({
                documentType: extraction.documentType,
                extractedFields: (extraction.extractedFields as any) || null,
                supplierName: supplier.displayName,
                originalFileName: file.fileName,
                fileExtension,
              });

              await tx
                .update(filesTable)
                .set({
                  metadata: {
                    ...(typeof file.metadata === "object" &&
                    file.metadata !== null
                      ? file.metadata
                      : {}),
                    displayName,
                    supplierName: supplier.displayName,
                  },
                  updatedAt: new Date(),
                })
                .where(eq(filesTable.id, extraction.fileId));

              // Update search index with supplier information
              try {
                await searchOps.updateFile(extraction.fileId, tenantId, {
                  supplierName: supplier.displayName,
                  supplierId: result.supplierId,
                });
              } catch (error) {
                logger.error("Failed to update search index with supplier", {
                  fileId: extraction.fileId,
                  supplierId: result.supplierId,
                  error: error instanceof Error ? error.message : String(error),
                });
              }
            }
          }

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
        } else if (result.success && result.action === "skipped") {
          // Handle skipped (low confidence match or insufficient data)
          await tx
            .update(documentExtractions)
            .set({
              matchedSupplierId: null,
              matchConfidence: CONFIDENCE_SCORES.LOW_MATCH,
              processingNotes: "Skipped for manual review - low confidence match",
            })
            .where(eq(documentExtractions.id, documentExtractionId));

          logger.info("Supplier processing skipped", {
            documentExtractionId,
            reason: "Low confidence match requiring manual review",
          });

          return {
            success: true,
            action: "skipped",
          };
        } else {
          // Handle actual failure
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
