import { z } from 'zod';

export const fileSourceSchema = z.enum(['integration', 'user_upload', 'whatsapp']);

export const processingStatusSchema = z.enum(['pending', 'processing', 'completed', 'failed']);

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
  bucket: z.string().default('files'),
});

export type FileSource = z.infer<typeof fileSourceSchema>;
export type ProcessingStatus = z.infer<typeof processingStatusSchema>;
export type CreateFileInput = z.infer<typeof createFileSchema>;