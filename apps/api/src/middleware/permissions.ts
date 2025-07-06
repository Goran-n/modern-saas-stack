import { middleware } from '../lib/trpc'
import { TenantMemberService } from '../services/tenant-member.service'
import type { MemberPermissions } from '../database/schema/tenant-members'
import { AuthenticationError, InsufficientPermissionsError } from '../lib/errors'
import { container, TOKENS } from '../shared/utils/container'
import type { TenantMemberRepository } from '../core/ports/tenant-member.repository'

type PermissionResource = keyof MemberPermissions
type PermissionAction = 'view' | 'edit' | 'create' | 'delete' | 'update' | 'testConnection' | 'manageCredentials'

const memberService = new TenantMemberService(
  container.resolve<TenantMemberRepository>(TOKENS.TENANT_MEMBER_REPOSITORY)
)

export const requirePermission = (
  resource: PermissionResource,
  action: PermissionAction
) => {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.tenantContext) {
      throw new AuthenticationError('No tenant context available')
    }

    if (!ctx.tenantContext.membership) {
      throw new AuthenticationError('No membership context available')
    }

    const hasPermission = await memberService.hasPermission(
      ctx.tenantContext.membership!,
      resource,
      action
    )

    if (!hasPermission) {
      throw new InsufficientPermissionsError(String(resource), action)
    }

    return next()
  })
}

export const requireAnyPermission = (
  permissions: Array<{ resource: PermissionResource; action: PermissionAction }>
) => {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.tenantContext?.membership) {
      throw new AuthenticationError('No tenant/membership context available')
    }

    const hasAnyPermission = await Promise.all(
      permissions.map(({ resource, action }) =>
        memberService.hasPermission(
          ctx.tenantContext!.membership,
          resource,
          action
        )
      )
    ).then(results => results.some(result => result))

    if (!hasAnyPermission) {
      const permissionList = permissions.map(p => `${p.action} ${String(p.resource)}`).join(', ')
      throw new InsufficientPermissionsError('resources', `any of: ${permissionList}`)
    }

    return next()
  })
}

export const requireOwnership = () => {
  return middleware(async ({ ctx, next }) => {
    if (!ctx.tenantContext?.membership) {
      throw new AuthenticationError('No membership context available')
    }

    if (ctx.tenantContext.membership.role !== 'owner') {
      throw new InsufficientPermissionsError('tenant', 'owner privileges required')
    }

    return next()
  })
}