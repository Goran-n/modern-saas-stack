import { z } from "zod";

// File source constants
export const FILE_SOURCES = {
  INTEGRATION: "integration",
  USER_UPLOAD: "user_upload",
  WHATSAPP: "whatsapp",
  SLACK: "slack",
  EMAIL: "email",
} as const;

export const fileSourceSchema = z.enum([
  FILE_SOURCES.INTEGRATION,
  FILE_SOURCES.USER_UPLOAD,
  FILE_SOURCES.WHATSAPP,
  FILE_SOURCES.SLACK,
  FILE_SOURCES.EMAIL,
]);

// Processing status constants
export const PROCESSING_STATUS = {
  PENDING: "pending",
  PENDING_UPLOAD: "pending_upload",
  PROCESSING: "processing",
  COMPLETED: "completed",
  FAILED: "failed",
  DEAD_LETTER: "dead_letter",
} as const;

export const processingStatusSchema = z.enum([
  PROCESSING_STATUS.PENDING,
  PROCESSING_STATUS.PENDING_UPLOAD,
  PROCESSING_STATUS.PROCESSING,
  PROCESSING_STATUS.COMPLETED,
  PROCESSING_STATUS.FAILED,
  PROCESSING_STATUS.DEAD_LETTER,
]);

export const createFileSchema = z.object({
  mimeType: z.string(),
  size: z.number(),
  source: fileSourceSchema,
  sourceId: z.string().optional().default(""),
  metadata: z.record(z.string(), z.unknown()).optional().default({}),
  tenantId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  bucket: z.string().optional().default(""),
});

export type FileSource = z.infer<typeof fileSourceSchema>;
export type ProcessingStatus = z.infer<typeof processingStatusSchema>;
export type CreateFileInput = z.infer<typeof createFileSchema>;
