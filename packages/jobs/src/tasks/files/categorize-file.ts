import { getConfig } from "@figgy/config";
import { DeduplicationService } from "@figgy/deduplication";
import { generateDisplayName } from "@figgy/file-manager";
import * as searchOps from "@figgy/search";
import {
  documentExtractions,
  eq,
  files as filesTable,
  getDatabaseConnection,
  type NewDocumentExtraction,
} from "@figgy/shared-db";
import { SupabaseStorageClient } from "@figgy/supabase-storage";
import { logger } from "@figgy/utils";
import { CategorizeFileSchema } from "@figgy/types";
import { schemaTask, tasks } from "@trigger.dev/sdk/v3";
import { DocumentExtractor } from "../../lib/document-extraction/extractor";

export const categorizeFile = schemaTask({
  id: "categorize-file",
  schema: CategorizeFileSchema,
  maxDuration: 60,
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
    randomize: true,
  },
  queue: {
    concurrencyLimit: 10,
  },
  run: async ({ fileId, tenantId, mimeType, source }) => {
    // Validate configuration before using it
    getConfig().validate();
    const config = getConfig().getCore();
    const db = getDatabaseConnection(config.DATABASE_URL);

    try {
      logger.info("Starting file categorization", {
        fileId,
        tenantId,
        mimeType,
        source,
      });

      // Update processing status to 'processing'
      await db
        .update(filesTable)
        .set({
          processingStatus: "processing",
          updatedAt: new Date(),
        })
        .where(eq(filesTable.id, fileId));

      // Fetch file details and verify tenant ownership
      const [file] = await db
        .select()
        .from(filesTable)
        .where(eq(filesTable.id, fileId))
        .limit(1);

      if (!file) {
        throw new Error(`File not found: ${fileId}`);
      }

      // Verify file belongs to the requesting tenant
      if (file.tenantId !== tenantId) {
        logger.error("Tenant mismatch - potential security issue", {
          fileId,
          fileTenantId: file.tenantId,
          requestTenantId: tenantId,
        });
        throw new Error(
          "Unauthorized: File does not belong to requesting tenant",
        );
      }

      // Check file size limit (10MB)
      const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
      if (file.size > MAX_FILE_SIZE) {
        logger.warn("File exceeds size limit for extraction", {
          fileId,
          size: file.size,
          maxSize: MAX_FILE_SIZE,
          sizeMB: (file.size / 1024 / 1024).toFixed(2),
        });

        // Update as too large
        await db
          .update(filesTable)
          .set({
            processingStatus: "failed",
            metadata: {
              ...(typeof file.metadata === "object" && file.metadata !== null
                ? file.metadata
                : {}),
              categorized: false,
              error: "file_too_large",
              errorMessage: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds 10MB limit`,
              processedAt: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(filesTable.id, fileId));

        return {
          fileId,
          status: "failed",
          error: "file_too_large",
        };
      }

      // Check if this is a supported document type for extraction
      const supportedMimeTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/heic",
        "image/heif",
      ];

      if (!supportedMimeTypes.includes(file.mimeType)) {
        logger.info("File type not supported for extraction", {
          fileId,
          mimeType: file.mimeType,
        });

        // Update as non-extractable
        await db
          .update(filesTable)
          .set({
            processingStatus: "completed",
            metadata: {
              ...(typeof file.metadata === "object" && file.metadata !== null
                ? file.metadata
                : {}),
              categorized: true,
              category: "non-extractable",
              processedAt: new Date().toISOString(),
            },
            updatedAt: new Date(),
          })
          .where(eq(filesTable.id, fileId));

        return {
          fileId,
          status: "completed",
          category: "non-extractable",
        };
      }

      // Check if file hash exists and if it's a duplicate
      const deduplicationService = new DeduplicationService(db);

      if (file.contentHash) {
        const duplicateCheck = await deduplicationService.checkFileDuplicate(
          file.contentHash,
          file.size,
          file.tenantId,
          file.id,
        );

        if (duplicateCheck.isDuplicate && duplicateCheck.duplicateFileId) {
          logger.info(
            "File is a duplicate, checking if duplicate was already processed",
            {
              fileId,
              duplicateFileId: duplicateCheck.duplicateFileId,
              contentHash: file.contentHash,
            },
          );

          // Check if the duplicate file has already been processed
          const [duplicateFile] = await db
            .select()
            .from(filesTable)
            .where(eq(filesTable.id, duplicateCheck.duplicateFileId))
            .limit(1);

          if (duplicateFile && duplicateFile.processingStatus === "completed") {
            // Copy extraction results from duplicate
            const [duplicateExtraction] = await db
              .select()
              .from(documentExtractions)
              .where(
                eq(documentExtractions.fileId, duplicateCheck.duplicateFileId),
              )
              .limit(1);

            if (duplicateExtraction) {
              logger.info("Copying extraction results from duplicate file", {
                fileId,
                duplicateFileId: duplicateCheck.duplicateFileId,
              });

              // Generate display name from duplicate's extraction
              const fileExtension = file.fileName.substring(
                file.fileName.lastIndexOf("."),
              );
              const displayName = generateDisplayName({
                documentType: duplicateExtraction.documentType,
                extractedFields:
                  (duplicateExtraction.extractedFields as any) || null,
                supplierName: null, // Will be updated when supplier is matched
                originalFileName: file.fileName,
                fileExtension,
              });

              // Update file status
              await db
                .update(filesTable)
                .set({
                  processingStatus: "completed",
                  metadata: {
                    ...(typeof file.metadata === "object" &&
                    file.metadata !== null
                      ? file.metadata
                      : {}),
                    categorized: true,
                    isDuplicate: true,
                    duplicateOfFileId: duplicateCheck.duplicateFileId,
                    category: duplicateExtraction.documentType,
                    processedAt: new Date().toISOString(),
                    displayName,
                  },
                  updatedAt: new Date(),
                })
                .where(eq(filesTable.id, fileId));

              // Update search index for duplicate
              try {
                await searchOps.updateFile(fileId, tenantId, {
                  category: duplicateExtraction.documentType,
                  documentType: duplicateExtraction.documentType,
                });
              } catch (error) {
                logger.error("Failed to update search index for duplicate", {
                  fileId,
                  error: error instanceof Error ? error.message : String(error),
                });
              }

              return {
                fileId,
                status: "completed",
                category: duplicateExtraction.documentType,
                isDuplicate: true,
                duplicateFileId: duplicateCheck.duplicateFileId,
              };
            }
          }
        }
      }

      // Get signed URL for file
      const storage = new SupabaseStorageClient({
        url: config.SUPABASE_URL,
        serviceRoleKey: config.SUPABASE_SERVICE_KEY || config.SUPABASE_ANON_KEY,
        bucket: file.bucket,
      });

      const { data: signedUrl, error: urlError } = await storage.signedUrl(
        file.pathTokens.join("/"),
        300, // 5 minutes expiry for document processing
      );

      if (urlError || !signedUrl) {
        throw new Error(`Failed to generate signed URL: ${urlError}`);
      }

      // Validate the signed URL is from Supabase storage with strict checks
      const validateStorageUrl = (
        url: string,
        expectedBucket: string,
      ): { isValid: boolean; error?: string } => {
        try {
          const parsed = new URL(url);

          // Must be HTTPS in production
          if (
            config.NODE_ENV === "production" &&
            parsed.protocol !== "https:"
          ) {
            return { isValid: false, error: "HTTPS required in production" };
          }

          // Extract project ID from SUPABASE_URL
          const projectIdMatch = config.SUPABASE_URL.match(
            /https?:\/\/([^.]+)\.supabase\.(co|in)/,
          );
          const projectId = projectIdMatch ? projectIdMatch[1] : null;

          // Validate hostname
          const validHosts = projectId
            ? [
                `${projectId}.supabase.co`,
                `${projectId}.supabase.in`, // Regional endpoints
                "localhost", // Development only
              ]
            : ["localhost"];

          const isValidHost = validHosts.some(
            (host) =>
              parsed.hostname === host || parsed.hostname.endsWith(`.${host}`),
          );

          if (!isValidHost) {
            return {
              isValid: false,
              error: `Invalid host: ${parsed.hostname}`,
            };
          }

          // Validate path structure: /storage/v1/object/sign/[bucket]/[...path]
          const pathMatch = parsed.pathname.match(
            /^\/storage\/v1\/object\/sign\/([^/]+)\//,
          );
          if (!pathMatch) {
            return {
              isValid: false,
              error: "Invalid storage URL path structure",
            };
          }

          const urlBucket = pathMatch[1];
          if (urlBucket !== expectedBucket) {
            return {
              isValid: false,
              error: `Bucket mismatch: expected ${expectedBucket}, got ${urlBucket}`,
            };
          }

          // Validate signature parameters
          if (!parsed.searchParams.has("token")) {
            return { isValid: false, error: "Missing signature token" };
          }

          return { isValid: true };
        } catch (error) {
          return { isValid: false, error: `URL parsing error: ${error}` };
        }
      };

      const urlValidation = validateStorageUrl(
        signedUrl.signedUrl,
        file.bucket,
      );
      if (!urlValidation.isValid) {
        logger.error("Invalid storage URL detected", {
          fileId,
          bucket: file.bucket,
          error: urlValidation.error,
          urlPrefix: `${signedUrl.signedUrl.substring(0, 100)}...`,
        });
        throw new Error(`Invalid storage URL: ${urlValidation.error}`);
      }

      // Extract document data
      const extractor = new DocumentExtractor();
      const extraction = await extractor.extractDocument(
        signedUrl.signedUrl,
        file.mimeType,
      );

      // Save extraction results
      const extractionData: NewDocumentExtraction = {
        fileId: file.id,
        documentType: extraction.documentType,
        documentTypeConfidence: extraction.documentTypeConfidence.toString(),
        extractedFields: extraction.fields || {},
        companyProfile: extraction.companyProfile
          ? extraction.companyProfile
          : null,
        lineItems: extraction.lineItems,
        overallConfidence: extraction.overallConfidence.toString(),
        dataCompleteness: extraction.dataCompleteness.toString(),
        validationStatus: extraction.validationStatus,
        annotations: extraction.annotations,
        extractionMethod: extraction.extractionMethod,
        processingDurationMs: extraction.processingDuration,
        modelVersion: extraction.processingVersion,
        errors: extraction.errors,
      };

      const [insertedExtraction] = await db
        .insert(documentExtractions)
        .values(extractionData)
        .returning();

      if (!insertedExtraction) {
        throw new Error("Failed to insert document extraction");
      }

      // Check for invoice-level duplicates
      if (
        ["invoice", "receipt", "purchase_order"].includes(
          extraction.documentType || "",
        )
      ) {
        const invoiceDuplicateResult =
          await deduplicationService.checkInvoiceDuplicate(
            insertedExtraction.id,
            (extraction.fields as any) || {},
            file.tenantId,
          );

        // Update extraction with duplicate status
        await deduplicationService.updateInvoiceDuplicateStatus(
          insertedExtraction.id,
          invoiceDuplicateResult,
        );

        logger.info("Invoice duplicate check completed", {
          extractionId: insertedExtraction.id,
          duplicateType: invoiceDuplicateResult.duplicateType,
          duplicateConfidence: invoiceDuplicateResult.duplicateConfidence,
          isDuplicate: invoiceDuplicateResult.isDuplicate,
        });
      }

      // Trigger supplier processing for invoice-type documents
      if (
        ["invoice", "receipt", "purchase_order"].includes(
          extraction.documentType || "",
        )
      ) {
        logger.info("Triggering supplier processing", {
          documentExtractionId: insertedExtraction.id,
          documentType: extraction.documentType,
          tenantId,
        });

        await tasks.trigger(
          "process-invoice-supplier",
          {
            documentExtractionId: insertedExtraction.id,
            tenantId,
            userId: undefined, // userId not available in file processing context
          },
          {
            queue: {
              name: `tenant-${tenantId}`, // Ensure sequential processing per tenant
            },
          },
        );
      }

      // Generate display name based on extracted data
      const fileExtension = file.fileName.substring(
        file.fileName.lastIndexOf("."),
      );
      const displayName = generateDisplayName({
        documentType: extraction.documentType,
        extractedFields: extraction.fields || null,
        supplierName: null, // Will be updated when supplier is matched
        originalFileName: file.fileName,
        fileExtension,
      });

      // Update file with categorization results
      await db
        .update(filesTable)
        .set({
          processingStatus: "completed",
          metadata: {
            ...(typeof file.metadata === "object" && file.metadata !== null
              ? file.metadata
              : {}),
            categorized: true,
            category: extraction.documentType,
            documentType: extraction.documentType,
            extractionConfidence: extraction.overallConfidence,
            validationStatus: extraction.validationStatus,
            processedAt: new Date().toISOString(),
            displayName,
          },
          updatedAt: new Date(),
        })
        .where(eq(filesTable.id, fileId));

      // Update search index with extraction results
      try {
        const updateData: Parameters<typeof searchOps.updateFile>[2] = {
          category: extraction.documentType,
          extractedText: extraction.fields?.description
            ? String(extraction.fields.description)
            : "",
          documentType: extraction.documentType,
        };

        if (extraction.fields?.invoiceNumber) {
          updateData.invoiceNumber = String(extraction.fields.invoiceNumber);
        }

        if (extraction.fields?.amount) {
          updateData.amount = Number(extraction.fields.amount);
        }

        await searchOps.updateFile(fileId, tenantId, updateData);
      } catch (error) {
        logger.error("Failed to update search index", {
          fileId,
          error: error instanceof Error ? error.message : String(error),
        });
        // Don't throw - search update failure shouldn't fail the categorization
      }

      logger.info("File categorization and extraction completed", {
        fileId,
        tenantId,
        documentType: extraction.documentType,
        confidence: extraction.overallConfidence,
        validationStatus: extraction.validationStatus,
      });

      return {
        fileId,
        status: "completed",
        category: extraction.documentType,
        confidence: extraction.overallConfidence,
        validationStatus: extraction.validationStatus,
      };
    } catch (error) {
      logger.error("File categorization failed", {
        fileId,
        tenantId,
        error,
      });

      // Update processing status to 'failed'
      await db
        .update(filesTable)
        .set({
          processingStatus: "failed",
          updatedAt: new Date(),
        })
        .where(eq(filesTable.id, fileId));

      throw error;
    }
  },
});
