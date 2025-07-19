import { z } from "zod";

export const categorizeFileSchema = z.object({
  fileId: z.string().uuid(),
  tenantId: z.string().uuid(),
  mimeType: z.string(),
  size: z.number(),
  pathTokens: z.array(z.string()),
  source: z.enum(['integration', 'user_upload', 'whatsapp', 'slack']),
});

export type CategorizeFilePayload = z.infer<typeof categorizeFileSchema>;