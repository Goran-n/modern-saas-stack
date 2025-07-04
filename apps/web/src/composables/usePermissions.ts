import { computed, type ComputedRef } from 'vue'
import { useWorkspaceStore } from '@/stores/workspace'
import type { MemberPermissions } from '@kibly/shared-types'

export interface PermissionCheck {
  hasPermission: (category: string, action: string) => boolean
  hasAnyPermission: (checks: Array<{ category: string; action: string }>) => boolean
  hasAllPermissions: (checks: Array<{ category: string; action: string }>) => boolean
  isOwner: ComputedRef<boolean>
  isAdmin: ComputedRef<boolean>
  canManageIntegrations: ComputedRef<boolean>
  canManageTeam: ComputedRef<boolean>
  canManageTenant: ComputedRef<boolean>
  canViewAnalytics: ComputedRef<boolean>
}

/**
 * Composable for checking user permissions in the current workspace
 * 
 * @example
 * ```ts
 * const { hasPermission, canManageIntegrations } = usePermissions()
 * 
 * if (hasPermission('providers', 'connect')) {
 *   // User can connect providers
 * }
 * 
 * if (canManageIntegrations.value) {
 *   // User can manage all integration operations
 * }
 * ```
 */
export function usePermissions(): PermissionCheck {
  const workspaceStore = useWorkspaceStore()
  
  const currentMembership = computed(() => workspaceStore.currentMembership)
  const permissions = computed(() => currentMembership.value?.permissions)

  const hasPermission = (category: string, action: string): boolean => {
    if (!permissions.value) return false
    
    const categoryPermissions = permissions.value[category as keyof MemberPermissions]
    if (!categoryPermissions || typeof categoryPermissions !== 'object') return false
    
    return (categoryPermissions as Record<string, boolean>)[action] ?? false
  }

  const hasAnyPermission = (checks: Array<{ category: string; action: string }>): boolean => {
    return checks.some(({ category, action }) => hasPermission(category, action))
  }

  const hasAllPermissions = (checks: Array<{ category: string; action: string }>): boolean => {
    return checks.every(({ category, action }) => hasPermission(category, action))
  }

  const isOwner = computed(() => currentMembership.value?.role === 'owner')
  const isAdmin = computed(() => currentMembership.value?.role === 'admin')

  // Common permission combinations
  const canManageIntegrations = computed(() => 
    hasAllPermissions([
      { category: 'providers', action: 'connect' },
      { category: 'providers', action: 'disconnect' },
      { category: 'providers', action: 'configure' }
    ])
  )

  const canManageTeam = computed(() =>
    hasAllPermissions([
      { category: 'team', action: 'invite' },
      { category: 'team', action: 'remove' },
      { category: 'team', action: 'changeRoles' }
    ])
  )

  const canManageTenant = computed(() =>
    hasAllPermissions([
      { category: 'tenant', action: 'edit' },
      { category: 'tenant', action: 'billing' }
    ])
  )

  const canViewAnalytics = computed(() =>
    hasPermission('analytics', 'view')
  )

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    isOwner,
    isAdmin,
    canManageIntegrations,
    canManageTeam,
    canManageTenant,
    canViewAnalytics
  }
}