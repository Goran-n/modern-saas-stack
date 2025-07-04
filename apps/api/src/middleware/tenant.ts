import type { Context, Next } from 'hono'
import { getTenantService, getTenantMemberService } from '../lib/di/services'
import { getAuthUser } from './auth'
import log from '../config/logger'

// Use types from context to avoid circular dependencies
import type { TenantContext } from '../lib/context'

export type { TenantContext }

/**
 * Tenant isolation middleware - validates tenant access and injects context
 */
export async function tenantMiddleware(c: Context, next: Next): Promise<Response | void> {
  const tenantId = c.req.header('x-tenant-id')
  
  if (!tenantId) {
    return c.json({ error: 'Missing x-tenant-id header' }, 400)
  }

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(tenantId)) {
    return c.json({ error: 'Invalid tenant ID format' }, 400)
  }

  const user = getAuthUser(c)
  if (!user) {
    return c.json({ error: 'Authentication required for tenant access' }, 401)
  }

  try {
    const tenantService = await getTenantService()
    const memberService = await getTenantMemberService()

    // Get tenant
    const tenant = await tenantService.getTenantById(tenantId)
    if (!tenant) {
      return c.json({ error: 'Tenant not found' }, 404)
    }

    if (tenant.status !== 'active') {
      return c.json({ error: 'Tenant is not active' }, 403)
    }

    // Check user membership
    const membership = await memberService.getMemberByUserAndTenant(user.id, tenantId)
    if (!membership) {
      return c.json({ error: 'Access denied to tenant' }, 403)
    }

    if (membership.status !== 'active') {
      return c.json({ error: 'Membership is not active' }, 403)
    }

    // Update last access
    await memberService.updateLastAccess(user.id, tenantId)

    // Set tenant context
    c.set('tenantContext', {
      tenantId,
      tenant,
      membership
    })

    await next()
  } catch (error) {
    log.error('Tenant middleware error:', error)
    return c.json({ error: 'Failed to validate tenant access' }, 500)
  }
}

/**
 * Optional tenant middleware - allows requests with or without tenant context
 */
export async function optionalTenantMiddleware(c: Context, next: Next) {
  const tenantId = c.req.header('x-tenant-id')
  const user = getAuthUser(c)
  
  if (tenantId && user) {
    try {
      const tenantService = await getTenantService()
      const memberService = await getTenantMemberService()

      const tenant = await tenantService.getTenantById(tenantId)
      const membership = await memberService.getMemberByUserAndTenant(user.id, tenantId)

      if (tenant && membership && tenant.status === 'active' && membership.status === 'active') {
        c.set('tenantContext', {
          tenantId,
          tenant,
          membership
        })
        
        await memberService.updateLastAccess(user.id, tenantId)
      }
    } catch (error) {
      log.error({
        err: error,
        tenantId,
        userId: user.id
      }, 'Optional tenant middleware error')
    }
  }

  await next()
}

/**
 * Get tenant context from request
 */
export function getTenantContext(c: Context): TenantContext | null {
  return c.get('tenantContext') || null
}

/**
 * Require tenant context - throws if not available
 */
export function requireTenantContext(c: Context): TenantContext {
  const context = getTenantContext(c)
  if (!context) {
    throw new Error('Tenant context required')
  }
  return context
}

/**
 * Permission checking middleware
 */
export function requirePermission(category: string, permission: string) {
  return async (c: Context, next: Next): Promise<Response | void> => {
    const tenantContext = getTenantContext(c)
    if (!tenantContext) {
      return c.json({ error: 'Tenant context required' }, 400)
    }

    const memberService = await getTenantMemberService()
    const hasPermission = memberService.hasPermission(
      tenantContext.membership,
      category as any,
      permission
    )

    if (!hasPermission) {
      return c.json({ error: 'Insufficient permissions' }, 403)
    }

    await next()
  }
}

/**
 * Role-based access middleware
 */
export function requireRole(minimumRole: 'viewer' | 'member' | 'admin' | 'owner') {
  const roleHierarchy = { viewer: 3, member: 2, admin: 1, owner: 0 }
  
  return async (c: Context, next: Next): Promise<Response | void> => {
    const tenantContext = getTenantContext(c)
    if (!tenantContext) {
      return c.json({ error: 'Tenant context required' }, 400)
    }

    const userRoleLevel = roleHierarchy[tenantContext.membership.role as keyof typeof roleHierarchy]
    const requiredRoleLevel = roleHierarchy[minimumRole]

    if (userRoleLevel > requiredRoleLevel) {
      return c.json({ error: 'Insufficient role permissions' }, 403)
    }

    await next()
  }
}