import { z } from "zod";

// Common validation schemas
export const emailSchema = z.string().email();
export const uuidSchema = z.string().uuid();
export const slugSchema = z.string().regex(/^[a-z0-9-]+$/);

// Validation helper functions
export function validateEmail(email: string): boolean {
  return emailSchema.safeParse(email).success;
}

export function validateUuid(id: string): boolean {
  return uuidSchema.safeParse(id).success;
}

export function validateSlug(slug: string): boolean {
  return slugSchema.safeParse(slug).success;
}

// Generic validation function
export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return { success: true, data: result.data };
  }
  
  return { 
    success: false, 
    error: result.error.errors.map(e => e.message).join(", ") 
  };
}