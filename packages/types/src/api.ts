import { z } from 'zod';

// API Response schemas
export const ApiErrorSchema = z.object({
  error: z.string(),
  message: z.string().optional(),
  code: z.string().optional(),
  statusCode: z.number().optional(),
});

export const ApiSuccessSchema = z.object({
  success: z.literal(true),
  data: z.unknown(),
  metadata: z.record(z.unknown()).optional(),
});

export const PaginatedResponseSchema = z.object({
  items: z.array(z.unknown()),
  total: z.number(),
  page: z.number(),
  pageSize: z.number(),
  hasMore: z.boolean(),
});

// Generic API response type helper
export function createApiResponse<T extends z.ZodType>(dataSchema: T) {
  return z.union([
    z.object({
      success: z.literal(true),
      data: dataSchema,
      metadata: z.record(z.unknown()).optional(),
    }),
    ApiErrorSchema,
  ]);
}

// Type exports
export type ApiError = z.infer<typeof ApiErrorSchema>;
export type ApiSuccess<T = unknown> = {
  success: true;
  data: T;
  metadata?: Record<string, unknown>;
};
export type ApiResponse<T = unknown> = ApiSuccess<T> | ApiError;
export type PaginatedResponse<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
};