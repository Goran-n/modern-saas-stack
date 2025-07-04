import type { Context as HonoContext } from 'hono'
import type { AuthUser } from '../lib/context'
import type { TenantContext } from '../lib/context'

// Define the variables that can be stored in Hono context
interface HonoVariables {
  requestId: string
  user?: AuthUser
  tenantContext?: TenantContext
}

// Extend Hono's Context type with our variables
export type AppContext = HonoContext<{ Variables: HonoVariables }>

// Export helper type for middleware
export type { HonoVariables }