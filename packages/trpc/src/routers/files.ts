import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter } from "../trpc";
import { tenantProcedure } from "../trpc/procedures";
import { logger } from "@kibly/utils";
import { files as filesTable, documentExtractions, suppliers, eq, and, desc, inArray, sql } from "@kibly/shared-db";
import { tasks } from "@trigger.dev/sdk/v3";
import type { CategorizeFilePayload } from "@kibly/jobs";
import { getConfig } from "@kibly/config";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/json",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// Get storage bucket from config
const getStorageBucket = () => {
  try {
    const config = getConfig().getForFileManager();
    return config.STORAGE_BUCKET || 'vault';
  } catch (error) {
    // Fallback to default if config is not available
    return 'vault';
  }
};

export const filesRouter = createTRPCRouter({
  upload: tenantProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.string(),
        size: z.number().positive(),
        base64Data: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { fileName, mimeType, size, base64Data } = input;

      if (size > MAX_FILE_SIZE) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `File size exceeds maximum limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
        });
      }

      if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "File type not allowed",
        });
      }

      try {
        const fileBuffer = Buffer.from(base64Data, "base64");
        
        const sanitisedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const timestamp = Date.now();
        const pathTokens = [ctx.tenantId, ctx.user.id, `${timestamp}_${sanitisedFileName}`];
        const fullPath = pathTokens.join("/");

        // Upload directly using Supabase client
        const storageBucket = getStorageBucket();
        const { error: uploadError } = await ctx.supabase.storage
          .from(storageBucket)
          .upload(fullPath, fileBuffer, {
            contentType: mimeType,
            upsert: false,
          });

        if (uploadError) {
          throw uploadError;
        }

        const { data: { publicUrl } } = ctx.supabase.storage
          .from(storageBucket)
          .getPublicUrl(fullPath);

        const [fileRecord] = await ctx.db
          .insert(filesTable)
          .values({
            tenantId: ctx.tenantId,
            uploadedBy: ctx.user.id,
            fileName,
            pathTokens,
            mimeType,
            size,
            source: "user_upload",
            metadata: {
              originalName: fileName,
              publicUrl,
            },
          })
          .returning();

        if (!fileRecord) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: "Failed to create file record",
          });
        }

        logger.info("File uploaded successfully", {
          fileId: fileRecord.id,
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          fileName,
          size,
          requestId: ctx.requestId,
        });

        // Trigger categorization job
        await tasks.trigger("categorize-file", {
          fileId: fileRecord.id,
          tenantId: ctx.tenantId,
          mimeType: fileRecord.mimeType,
          size: fileRecord.size,
          pathTokens: fileRecord.pathTokens,
          source: fileRecord.source,
        } satisfies CategorizeFilePayload);

        logger.info("File categorization job triggered", {
          fileId: fileRecord.id,
          tenantId: ctx.tenantId,
        });

        return {
          id: fileRecord.id,
          fileName: fileRecord.fileName,
          size: fileRecord.size,
          mimeType: fileRecord.mimeType,
          createdAt: fileRecord.createdAt,
        };
      } catch (error) {
        logger.error("Failed to upload file", {
          error,
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          fileName,
          requestId: ctx.requestId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to upload file",
        });
      }
    }),

  getSignedUrl: tenantProcedure
    .input(
      z.object({
        fileId: z.string().uuid(),
        expiresIn: z.number().min(60).max(3600).default(3600),
        download: z.boolean().default(false), // Add option to control download behavior
      })
    )
    .query(async ({ ctx, input }) => {
      const { fileId, expiresIn, download } = input;

      const file = await ctx.db
        .select()
        .from(filesTable)
        .where(
          and(
            eq(filesTable.id, fileId),
            eq(filesTable.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!file[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      try {
        const filePath = file[0].pathTokens.join("/");
        const storageBucket = getStorageBucket();
        
        logger.info("Generating signed URL", {
          fileId,
          filePath,
          storageBucket,
          expiresIn,
          download,
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
        });

        const { data, error: urlError } = await ctx.supabase.storage
          .from(storageBucket)
          .createSignedUrl(filePath, expiresIn, {
            download: download // Use the download parameter from input
          });

        if (urlError) {
          logger.error("Supabase storage error", {
            error: urlError,
            fileId,
            filePath,
            storageBucket,
            tenantId: ctx.tenantId,
            requestId: ctx.requestId,
          });
          throw urlError;
        }

        if (!data) {
          logger.error("No data returned from Supabase", {
            fileId,
            filePath,
            storageBucket,
            tenantId: ctx.tenantId,
            requestId: ctx.requestId,
          });
          throw new Error("No data returned from Supabase storage");
        }

        logger.info("Signed URL generated successfully", {
          fileId,
          url: data.signedUrl,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
        });

        return {
          url: data.signedUrl,
          expiresAt: new Date(Date.now() + expiresIn * 1000),
        };
      } catch (error) {
        logger.error("Failed to generate signed URL", {
          error,
          fileId,
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to generate download URL",
        });
      }
    }),

  list: tenantProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset } = input;

      const files = await ctx.db
        .select({
          id: filesTable.id,
          fileName: filesTable.fileName,
          mimeType: filesTable.mimeType,
          size: filesTable.size,
          createdAt: filesTable.createdAt,
        })
        .from(filesTable)
        .where(eq(filesTable.tenantId, ctx.tenantId))
        .orderBy(desc(filesTable.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        files,
        hasMore: files.length === limit,
      };
    }),

  delete: tenantProcedure
    .input(
      z.object({
        fileId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { fileId } = input;

      const file = await ctx.db
        .select()
        .from(filesTable)
        .where(
          and(
            eq(filesTable.id, fileId),
            eq(filesTable.tenantId, ctx.tenantId),
            eq(filesTable.uploadedBy, ctx.user.id)
          )
        )
        .limit(1);

      if (!file[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found or you don't have permission to delete it",
        });
      }

      try {
        const filePath = file[0].pathTokens.join("/");
        const storageBucket = getStorageBucket();
        const { error: removeError } = await ctx.supabase.storage
          .from(storageBucket)
          .remove([filePath]);

        if (removeError) {
          throw removeError;
        }

        await ctx.db
          .delete(filesTable)
          .where(eq(filesTable.id, fileId));

        logger.info("File deleted successfully", {
          fileId,
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          requestId: ctx.requestId,
        });

        return { success: true };
      } catch (error) {
        logger.error("Failed to delete file", {
          error,
          fileId,
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to delete file",
        });
      }
    }),

  getById: tenantProcedure
    .input(
      z.object({
        fileId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { fileId } = input;

      const file = await ctx.db
        .select()
        .from(filesTable)
        .where(
          and(
            eq(filesTable.id, fileId),
            eq(filesTable.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!file[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      return {
        id: file[0].id,
        fileName: file[0].fileName,
        mimeType: file[0].mimeType,
        size: file[0].size,
        processingStatus: file[0].processingStatus,
        createdAt: file[0].createdAt,
        updatedAt: file[0].updatedAt,
      };
    }),

  getWithExtractions: tenantProcedure
    .input(
      z.object({
        fileId: z.string().uuid(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { fileId } = input;

      const file = await ctx.db
        .select()
        .from(filesTable)
        .where(
          and(
            eq(filesTable.id, fileId),
            eq(filesTable.tenantId, ctx.tenantId)
          )
        )
        .limit(1);

      if (!file[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      // Get document extractions for this file
      const extractions = await ctx.db
        .select()
        .from(documentExtractions)
        .where(eq(documentExtractions.fileId, fileId))
        .orderBy(desc(documentExtractions.createdAt))
        .limit(1);

      return {
        id: file[0].id,
        fileName: file[0].fileName,
        mimeType: file[0].mimeType,
        size: file[0].size,
        processingStatus: file[0].processingStatus,
        createdAt: file[0].createdAt,
        updatedAt: file[0].updatedAt,
        extraction: extractions[0] || null,
      };
    }),

  processBatch: tenantProcedure
    .input(
      z.object({
        fileIds: z.array(z.string().uuid()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const files = await ctx.db
        .select()
        .from(filesTable)
        .where(
          and(
            eq(filesTable.tenantId, ctx.tenantId),
            inArray(filesTable.id, input.fileIds)
          )
        );

      if (files.length === 0) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No files found",
        });
      }

      const jobHandle = await tasks.batchTrigger(
        "categorize-file",
        files.map(file => ({
          payload: {
            fileId: file.id,
            tenantId: file.tenantId,
            mimeType: file.mimeType,
            size: file.size,
            pathTokens: file.pathTokens,
            source: file.source,
          } satisfies CategorizeFilePayload,
        }))
      );

      logger.info("Batch file categorization jobs triggered", {
        count: files.length,
        tenantId: ctx.tenantId,
        requestId: ctx.requestId,
      });

      return {
        triggered: files.length,
        jobHandle: jobHandle.batchId,
      };
    }),

  getGroupedByYear: tenantProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      try {
        // Get all files with their extractions and suppliers
        const filesWithData = await ctx.db
          .select({
            id: filesTable.id,
            fileName: filesTable.fileName,
            mimeType: filesTable.mimeType,
            size: filesTable.size,
            processingStatus: filesTable.processingStatus,
            createdAt: filesTable.createdAt,
            updatedAt: filesTable.updatedAt,
            extraction: {
              id: documentExtractions.id,
              documentType: documentExtractions.documentType,
              overallConfidence: documentExtractions.overallConfidence,
              validationStatus: documentExtractions.validationStatus,
              extractedFields: documentExtractions.extractedFields,
            },
            supplier: {
              id: suppliers.id,
              displayName: suppliers.displayName,
              legalName: suppliers.legalName,
            },
          })
          .from(filesTable)
          .leftJoin(documentExtractions, eq(documentExtractions.fileId, filesTable.id))
          .leftJoin(suppliers, eq(suppliers.id, documentExtractions.matchedSupplierId))
          .where(eq(filesTable.tenantId, ctx.tenantId))
          .orderBy(desc(filesTable.createdAt));

        // Group files by year and supplier
        const groupedData: Record<string, any> = {};

        filesWithData.forEach((file) => {
          const year = new Date(file.createdAt).getFullYear().toString();
          const supplierName = file.supplier?.displayName || file.supplier?.legalName || 'Unknown Supplier';

          if (!groupedData[year]) {
            groupedData[year] = {
              year,
              suppliers: {},
              totalFiles: 0,
            };
          }

          if (!groupedData[year].suppliers[supplierName]) {
            groupedData[year].suppliers[supplierName] = {
              name: supplierName,
              supplierId: file.supplier?.id || null,
              files: [],
              fileCount: 0,
            };
          }

          const fileData = {
            id: file.id,
            fileName: file.fileName,
            mimeType: file.mimeType,
            size: file.size,
            processingStatus: file.processingStatus,
            createdAt: file.createdAt,
            updatedAt: file.updatedAt,
            extraction: file.extraction.id ? file.extraction : null,
          };

          groupedData[year].suppliers[supplierName].files.push(fileData);
          groupedData[year].suppliers[supplierName].fileCount++;
          groupedData[year].totalFiles++;
        });

        return {
          byYear: groupedData,
          totalFiles: filesWithData.length,
        };
      } catch (error) {
        logger.error("Failed to get grouped files", {
          error,
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve files",
        });
      }
    }),

  getProcessingStatus: tenantProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      try {
        const processingFiles = await ctx.db
          .select({
            id: filesTable.id,
            fileName: filesTable.fileName,
            mimeType: filesTable.mimeType,
            size: filesTable.size,
            processingStatus: filesTable.processingStatus,
            createdAt: filesTable.createdAt,
            updatedAt: filesTable.updatedAt,
          })
          .from(filesTable)
          .where(
            and(
              eq(filesTable.tenantId, ctx.tenantId),
              inArray(filesTable.processingStatus, ['processing', 'pending'])
            )
          )
          .orderBy(desc(filesTable.createdAt));

        const failedFiles = await ctx.db
          .select({
            id: filesTable.id,
            fileName: filesTable.fileName,
            mimeType: filesTable.mimeType,
            size: filesTable.size,
            processingStatus: filesTable.processingStatus,
            createdAt: filesTable.createdAt,
            updatedAt: filesTable.updatedAt,
          })
          .from(filesTable)
          .where(
            and(
              eq(filesTable.tenantId, ctx.tenantId),
              eq(filesTable.processingStatus, 'failed')
            )
          )
          .orderBy(desc(filesTable.createdAt));

        return {
          processing: processingFiles,
          failed: failedFiles,
        };
      } catch (error) {
        logger.error("Failed to get processing status files", {
          error,
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve status files",
        });
      }
    }),

  getBySupplierAndYear: tenantProcedure
    .input(
      z.object({
        year: z.string(),
        supplierId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { year, supplierId } = input;

      try {
        const startOfYear = new Date(`${year}-01-01T00:00:00.000Z`);
        const endOfYear = new Date(`${parseInt(year) + 1}-01-01T00:00:00.000Z`);

        let query = ctx.db
          .select({
            id: filesTable.id,
            fileName: filesTable.fileName,
            mimeType: filesTable.mimeType,
            size: filesTable.size,
            processingStatus: filesTable.processingStatus,
            createdAt: filesTable.createdAt,
            updatedAt: filesTable.updatedAt,
            extraction: {
              id: documentExtractions.id,
              documentType: documentExtractions.documentType,
              overallConfidence: documentExtractions.overallConfidence,
              validationStatus: documentExtractions.validationStatus,
              extractedFields: documentExtractions.extractedFields,
            },
            supplier: {
              id: suppliers.id,
              displayName: suppliers.displayName,
              legalName: suppliers.legalName,
            },
          })
          .from(filesTable)
          .leftJoin(documentExtractions, eq(documentExtractions.fileId, filesTable.id))
          .leftJoin(suppliers, eq(suppliers.id, documentExtractions.matchedSupplierId))
          .where(
            and(
              eq(filesTable.tenantId, ctx.tenantId),
              sql`${filesTable.createdAt} >= ${startOfYear}`,
              sql`${filesTable.createdAt} < ${endOfYear}`
            )
          );

        if (supplierId) {
          query = query.where(eq(documentExtractions.matchedSupplierId, supplierId));
        }

        const files = await query.orderBy(desc(filesTable.createdAt));

        return files.map((file) => ({
          id: file.id,
          fileName: file.fileName,
          mimeType: file.mimeType,
          size: file.size,
          processingStatus: file.processingStatus,
          createdAt: file.createdAt,
          updatedAt: file.updatedAt,
          extraction: file.extraction.id ? file.extraction : null,
          supplier: file.supplier.id ? file.supplier : null,
        }));
      } catch (error) {
        logger.error("Failed to get files by supplier and year", {
          error,
          year,
          supplierId,
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to retrieve files",
        });
      }
    }),
});