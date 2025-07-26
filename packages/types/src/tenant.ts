import { z } from 'zod';

// Tenant schemas
export const TenantSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  settings: z.record(z.string(), z.unknown()).optional(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export const UserTenantSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  tenantId: z.string().uuid(),
  role: z.enum(['owner', 'admin', 'member']),
  lastAccessAt: z.date(),
  createdAt: z.date(),
  tenant: TenantSchema,
});

// Type exports
export type Tenant = z.infer<typeof TenantSchema>;
export type UserTenant = z.infer<typeof UserTenantSchema>;
export type TenantRole = UserTenant['role'];