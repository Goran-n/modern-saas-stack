import type { Context } from 'hono'
import log from '../config/logger'

// Import types only to avoid circular dependencies
export interface AuthUser {
  id: string
  email: string
  phone?: string
  aud?: string
  role?: string
  [key: string]: any
}

export interface TenantContext {
  tenantId: string
  tenant: any
  membership: any
}

export interface TRPCContext {
  log: typeof log
  requestId: string
  user?: AuthUser
  tenantContext?: TenantContext
  honoContext: Context
}

export function createContext(c: Context): TRPCContext {
  return {
    log,
    requestId: c.get('requestId') || crypto.randomUUID(),
    user: c.get('user') || undefined,
    tenantContext: c.get('tenantContext') || undefined,
    honoContext: c,
  }
}