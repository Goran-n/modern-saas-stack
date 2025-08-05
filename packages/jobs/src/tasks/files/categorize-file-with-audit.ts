import { getConfig } from "@figgy/config";
import { generateDisplayName } from "@figgy/file-manager";
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
import { schemaTask } from "@trigger.dev/sdk/v3";
import { DocumentExtractor } from "../../lib/document-extraction/extractor";
// @ts-ignore - audit module exists but TypeScript can't find it
import { 
  createAuditHelper,
  type AuditContext
} from "@figgy/audit";
import { v4 as uuidv4 } from "uuid";

export const categorizeFileWithAudit = schemaTask({
  id: "categorize-file-with-audit",
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

    // Create audit context
    const correlationId = uuidv4();
    const auditContext: AuditContext = {
      tenantId,
      correlationId,
      db,
    };
    
    const audit = createAuditHelper(auditContext);

    return await audit.trackDecision(
      {
        entityType: 'file',
        entityId: fileId,
        eventType: 'file.categorization',
        decision: `Start AI-powered file categorization and extraction`,
        context: {
          fileProcessing: {
            mimeType,
            source,
            processingStep: 'categorization_started',
          },
        },
        metadata: {
          taskId: 'categorize-file-with-audit',
          maxDuration: 60,
          retryPolicy: {
            maxAttempts: 3,
            minTimeout: 1000,
            maxTimeout: 10000,
          },
        },
      },
      async () => {
        // Step 1: File validation and status update
        await audit.logDecision({
          entityType: 'file',
          entityId: fileId,
          eventType: 'file.status_update',
          decision: `Update file status to 'processing'`,
          context: {
            fileProcessing: {
              processingStep: 'status_update',
            },
          },
        });

        await db
          .update(filesTable)
          .set({
            processingStatus: "processing",
            updatedAt: new Date(),
          })
          .where(eq(filesTable.id, fileId));

        // Step 2: Fetch and validate file details
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

        await audit.logDecision({
          entityType: 'file',
          entityId: fileId,
          eventType: 'file.validation',
          decision: `File validation passed - tenant ownership confirmed`,
          context: {
            fileProcessing: {
              fileName: file.fileName,
              mimeType: file.mimeType,
              size: file.size,
              processingStep: 'validation',
            },
          },
        });

        // Step 3: Size validation
        const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB in bytes
        if (file.size > MAX_FILE_SIZE) {
          await audit.logDecision({
            entityType: 'file',
            entityId: fileId,
            eventType: 'file.size_limit_exceeded',
            decision: `File exceeds size limit - marking as failed`,
            context: {
              fileProcessing: {
                fileName: file.fileName,
                size: file.size,
                processingStep: 'size_validation_failed',
              },
            },
            metadata: {
              maxSize: MAX_FILE_SIZE,
              actualSize: file.size,
              sizeMB: (file.size / 1024 / 1024).toFixed(2),
            },
          });

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
                errorDetails: `File size ${(file.size / 1024 / 1024).toFixed(2)}MB exceeds limit of ${MAX_FILE_SIZE / 1024 / 1024}MB`,
              },
              updatedAt: new Date(),
            })
            .where(eq(filesTable.id, fileId));

          return { success: false, reason: "file_too_large" };
        }

        // Step 4: Document type classification
        await audit.logDecision({
          entityType: 'file',
          entityId: fileId,
          eventType: 'extraction.classification_start',
          decision: `Begin AI document classification`,
          context: {
            extraction: {
              extractorType: 'DocumentExtractor',
              processingStep: 'classification',
            },
            fileProcessing: {
              fileName: file.fileName,
              mimeType: file.mimeType,
              size: file.size,
            },
          },
        });

        // Get signed URL for the file
        const storageClient = new SupabaseStorageClient({
          url: config.SUPABASE_URL,
          serviceRoleKey: config.SUPABASE_SERVICE_KEY!,
          bucket: 'files'
        });
        
        const signedUrlResult = await storageClient.signedUrl(
          file.pathTokens.join("/"),
          3600,
        );

        if (!signedUrlResult.data?.signedUrl) {
          throw new Error("Failed to generate signed URL for file");
        }

        // Initialize extractor and extract document
        const extractor = new DocumentExtractor();
        const extraction = await extractor.extractDocument(
          signedUrlResult.data.signedUrl,
          file.mimeType,
        );

        await audit.logDecision({
          entityType: 'file',
          entityId: fileId,
          eventType: 'extraction.classification_complete',
          decision: `Document classified as: ${extraction.documentType}`,
          context: {
            extraction: {
              extractorType: 'DocumentExtractor',
              documentType: extraction.documentType,
            },
          },
          confidence: extraction.documentTypeConfidence,
          metadata: {
            classificationConfidence: extraction.documentTypeConfidence,
            aiModel: extraction.processingVersion || 'unknown',
            processingDuration: extraction.processingDuration,
          },
        });

        // Step 5: Log field extraction results
        if (extraction.fields && Object.keys(extraction.fields).length > 0) {
          await audit.logDecision({
            entityType: 'file',
            entityId: fileId,
            eventType: 'extraction.field_extraction_complete',
            decision: `Field extraction completed with ${Object.keys(extraction.fields).length} fields`,
            context: {
              extraction: {
                extractorType: 'DocumentExtractor',
                extractedFields: Object.keys(extraction.fields),
              },
            },
            confidence: extraction.overallConfidence,
            metadata: {
              fieldsExtracted: Object.keys(extraction.fields).length,
              overallConfidence: extraction.overallConfidence,
              dataCompleteness: extraction.dataCompleteness,
            },
          });
        }


        // Step 6: Save extraction results
        await audit.logDecision({
          entityType: 'extraction',
          entityId: 'saving',
          eventType: 'extraction.save_start',
          decision: `Save extraction results to database`,
          context: {
            extraction: {
              documentType: extraction.documentType,
            },
          },
        });

        // Create extraction record
        const extractionData: NewDocumentExtraction = {
          fileId: file.id,
          documentType: extraction.documentType,
          documentTypeConfidence: extraction.documentTypeConfidence.toString(),
          extractedFields: extraction.fields || {},
          companyProfile: extraction.companyProfile ? extraction.companyProfile : null,
          lineItems: extraction.lineItems,
          overallConfidence: extraction.overallConfidence.toString(),
          dataCompleteness: extraction.dataCompleteness.toString(),
          validationStatus: extraction.validationStatus,
          annotations: extraction.annotations,
          extractionMethod: extraction.extractionMethod,
          processingDurationMs: extraction.processingDuration,
          modelVersion: extraction.processingVersion,
          errors: extraction.errors,
          ownershipValidation: undefined,
          requiresReview: false,
          reviewReason: undefined,
          reviewStatus: "pending",
        };

        const [insertedExtraction] = await db
          .insert(documentExtractions)
          .values(extractionData)
          .returning();

        if (!insertedExtraction) {
          throw new Error("Failed to insert document extraction");
        }

        // Step 7: Update file status and metadata
        const updatedMetadata = {
          ...(typeof file.metadata === "object" && file.metadata !== null
            ? file.metadata
            : {}),
          categorized: true,
          documentType: extraction.documentType,
          extractionId: insertedExtraction.id,
          displayName: generateDisplayName({
            documentType: extraction.documentType,
            extractedFields: extraction.fields,
            originalFileName: file.fileName,
            fileExtension: file.fileName.split('.').pop() || 'pdf',
          }),
          processedAt: new Date().toISOString(),
        };

        await db
          .update(filesTable)
          .set({
            processingStatus: "completed",
            metadata: updatedMetadata,
            updatedAt: new Date(),
          })
          .where(eq(filesTable.id, fileId));

        await audit.logDecision({
          entityType: 'file',
          entityId: fileId,
          eventType: 'file.processing_complete',
          decision: `File processing completed successfully`,
          context: {
            fileProcessing: {
              fileName: file.fileName,
              processingStep: 'completed',
            },
            extraction: {
              documentType: extraction.documentType,
              extractionId: insertedExtraction.id,
            },
          },
          confidence: extraction.overallConfidence,
          metadata: {
            finalStatus: 'completed',
            extractionId: insertedExtraction.id,
            totalProcessingTime: Date.now() - new Date(file.createdAt).getTime(),
          },
        });

        return {
          success: true,
          extractionId: insertedExtraction.id,
          documentType: extraction.documentType,
          overallConfidence: extraction.overallConfidence,
        };
      }
    );
  },
});