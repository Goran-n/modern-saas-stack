import { z } from 'zod';

// File source constants
export const FILE_SOURCES = {
  INTEGRATION: 'integration',
  USER_UPLOAD: 'user_upload',
  WHATSAPP: 'whatsapp',
} as const;

export const fileSourceSchema = z.enum([
  FILE_SOURCES.INTEGRATION,
  FILE_SOURCES.USER_UPLOAD,
  FILE_SOURCES.WHATSAPP,
]);

// Processing status constants
export const PROCESSING_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
} as const;

export const processingStatusSchema = z.enum([
  PROCESSING_STATUS.PENDING,
  PROCESSING_STATUS.PROCESSING,
  PROCESSING_STATUS.COMPLETED,
  PROCESSING_STATUS.FAILED,
]);

export const createFileSchema = z.object({
  fileName: z.string(),
  pathTokens: z.array(z.string()),
  mimeType: z.string(),
  size: z.number(),
  source: fileSourceSchema,
  sourceId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
  tenantId: z.string().uuid(),
  uploadedBy: z.string().uuid(),
  bucket: z.string().optional(),
});

export type FileSource = z.infer<typeof fileSourceSchema>;
export type ProcessingStatus = z.infer<typeof processingStatusSchema>;
export type CreateFileInput = z.infer<typeof createFileSchema>;