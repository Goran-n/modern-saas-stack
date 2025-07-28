import { z } from "zod";

export const FileStatusSchema = z.enum([
  "pending",
  "processing",
  "completed",
  "failed",
]);

export const FileSchema = z.object({
  id: z.string().uuid(),
  tenantId: z.string().uuid(),
  fileName: z.string(),
  mimeType: z.string(),
  size: z.number(),
  pathTokens: z.array(z.string()),
  uploadedBy: z.string().uuid(),
  status: FileStatusSchema,
  error: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const FileGroupByYearSchema = z.object({
  year: z.string(),
  suppliers: z.record(
    z.string(),
    z.object({
      fileCount: z.number(),
      files: z.array(FileSchema),
    }),
  ),
});

export const FileDataSchema = z.object({
  byYear: z.record(z.string(), FileGroupByYearSchema),
  totalFiles: z.number(),
});

export const CategorizeFileSchema = z.object({
  fileId: z.string().uuid(),
  tenantId: z.string().uuid(),
  mimeType: z.string(),
  size: z.number(),
  pathTokens: z.array(z.string()),
  source: z.enum(["integration", "user_upload", "whatsapp", "slack"]),
});

export type File = z.infer<typeof FileSchema>;
export type FileStatus = z.infer<typeof FileStatusSchema>;
export type FileGroupByYear = z.infer<typeof FileGroupByYearSchema>;
export type FileData = z.infer<typeof FileDataSchema>;
export type CategorizeFilePayload = z.infer<typeof CategorizeFileSchema>;
