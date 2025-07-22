import {
  deleteFileByUser,
  generateSignedUrl,
  getFileById,
  getFilesByProcessingStatus,
  getFilesBySupplierAndYear,
  getFilesGroupedByYear,
  getFileWithExtractions,
  listFiles,
  processBatchFiles,
  reprocessFile,
  setDb as setFileManagerDb,
  uploadFileFromBase64,
} from "@figgy/file-manager";
import { logger } from "@figgy/utils";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter } from "../trpc";
import { tenantProcedure } from "../trpc/procedures";

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

// Create a custom procedure that sets the db for file-manager
const fileManagerProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  // Set the database instance for file-manager
  setFileManagerDb(ctx.db);
  return next({ ctx });
});

export const filesRouter = createTRPCRouter({
  upload: fileManagerProcedure
    .input(
      z.object({
        fileName: z.string().min(1).max(255),
        mimeType: z.string(),
        size: z.number().positive(),
        base64Data: z.string(),
      }),
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
        const result = await uploadFileFromBase64({
          fileName,
          mimeType,
          size,
          base64Data,
          tenantId: ctx.tenantId,
          uploadedBy: ctx.user.id,
        });

        logger.info("File uploaded successfully", {
          fileId: result.id,
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          fileName,
          size,
          requestId: ctx.requestId,
        });

        return result;
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

  getSignedUrl: fileManagerProcedure
    .input(
      z.object({
        fileId: z.string().uuid(),
        expiresIn: z.number().min(60).max(3600).default(3600),
        download: z.boolean().default(false),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { fileId, expiresIn, download } = input;

      try {
        const result = await generateSignedUrl(fileId, ctx.tenantId, {
          expiresIn,
          download,
        });

        logger.info("Signed URL generated successfully", {
          fileId,
          expiresAt: result.expiresAt,
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage === "File not found") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found",
          });
        }

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

  list: fileManagerProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { limit, offset } = input;

      return listFiles(ctx.tenantId, { limit, offset });
    }),

  delete: fileManagerProcedure
    .input(
      z.object({
        fileId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { fileId } = input;

      try {
        const success = await deleteFileByUser(
          fileId,
          ctx.tenantId,
          ctx.user.id,
        );

        if (!success) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found or you don't have permission to delete it",
          });
        }

        logger.info("File deleted successfully", {
          fileId,
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          requestId: ctx.requestId,
        });

        return { success: true };
      } catch (error) {
        if (error instanceof TRPCError) {
          throw error;
        }

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

  getById: fileManagerProcedure
    .input(
      z.object({
        fileId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { fileId } = input;

      const file = await getFileById(fileId, ctx.tenantId);

      if (!file) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      return file;
    }),

  getWithExtractions: fileManagerProcedure
    .input(
      z.object({
        fileId: z.string().uuid(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { fileId } = input;

      const file = await getFileWithExtractions(fileId, ctx.tenantId);

      if (!file) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "File not found",
        });
      }

      return file;
    }),

  processBatch: fileManagerProcedure
    .input(
      z.object({
        fileIds: z.array(z.string().uuid()),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      try {
        const result = await processBatchFiles(input.fileIds, ctx.tenantId);

        logger.info("Batch file categorization jobs triggered", {
          count: result.triggered,
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage === "No files found") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "No files found",
          });
        }

        logger.error("Failed to process batch files", {
          error,
          fileIds: input.fileIds,
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to process files",
        });
      }
    }),

  getGroupedByYear: fileManagerProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      try {
        return await getFilesGroupedByYear(ctx.tenantId);
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

  getProcessingStatus: fileManagerProcedure
    .input(z.object({}))
    .query(async ({ ctx }) => {
      try {
        return await getFilesByProcessingStatus(ctx.tenantId);
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

  getBySupplierAndYear: fileManagerProcedure
    .input(
      z.object({
        year: z.string(),
        supplierId: z.string().uuid().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const { year, supplierId } = input;

      try {
        return await getFilesBySupplierAndYear(ctx.tenantId, year, supplierId);
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

  reprocess: fileManagerProcedure
    .input(
      z.object({
        fileId: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { fileId } = input;

      try {
        const result = await reprocessFile(fileId, ctx.tenantId);

        logger.info("File reprocessing triggered", {
          fileId,
          jobHandle: result.jobHandle,
          tenantId: ctx.tenantId,
          userId: ctx.user.id,
          requestId: ctx.requestId,
        });

        return result;
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";

        if (errorMessage === "File not found") {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "File not found",
          });
        }

        if (errorMessage === "File is already being processed") {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "File is already being processed",
          });
        }

        logger.error("Failed to reprocess file", {
          error,
          fileId,
          tenantId: ctx.tenantId,
          requestId: ctx.requestId,
        });

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to reprocess file",
        });
      }
    }),
});
