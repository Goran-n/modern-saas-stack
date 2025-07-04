import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { safeTRPCQuery, updateTRPCTenantContext } from '../lib/trpc'
import { trpc } from '../lib/trpc'

// API returns tenant with membership as a flat structure
export interface TenantWithMembership {
  id: string
  name: string
  slug: string
  email: string
  status: 'active' | 'suspended' | 'deleted'
  settings?: unknown
  subscription?: unknown
  metadata?: unknown
  createdAt: string
  updatedAt: string
  deletedAt: string | null
  membership: {
    id: string
    role: 'viewer' | 'member' | 'admin' | 'owner'
    status: 'pending' | 'active' | 'suspended' | 'removed'
    permissions: Record<string, unknown>
    joinedAt: string
    lastAccessAt?: string
  }
}

// Clean frontend interface
export interface Workspace {
  id: string
  name: string
  slug: string
  email: string
  status: 'active' | 'suspended' | 'deleted'
}

export interface WorkspaceMembership {
  id: string
  role: 'viewer' | 'member' | 'admin' | 'owner'
  status: 'pending' | 'active' | 'suspended' | 'removed'
  permissions: Record<string, unknown>
  joinedAt: string
  lastAccessAt?: string
}

export interface WorkspaceWithMembership {
  workspace: Workspace
  membership: WorkspaceMembership
}

/**
 * Workspace (Tenant) State Management
 * Simplified and cleaner API for workspace management
 */
export const useWorkspaceStore = defineStore('workspace', () => {
  // State
  const workspaces = ref<WorkspaceWithMembership[]>([])
  const currentWorkspaceId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Dependencies
  const authStore = useAuthStore()

  // Computed
  const current = computed(() => {
    if (!currentWorkspaceId.value) return null
    return workspaces.value.find(w => w.workspace.id === currentWorkspaceId.value) || null
  })

  const currentWorkspace = computed(() => current.value?.workspace || null)
  const currentMembership = computed(() => current.value?.membership || null)

  const hasWorkspaces = computed(() => workspaces.value.length > 0)
  const needsWorkspaceSelection = computed(() => 
    hasWorkspaces.value && !currentWorkspaceId.value
  )

  // Permission helpers
  const hasPermission = (category: string, permission: string): boolean => {
    if (!currentMembership.value) return false
    
    const permissions = currentMembership.value.permissions as any
    if (!permissions || !permissions[category]) return false
    
    const categoryPerms = permissions[category]
    
    // Handle both array format (legacy) and object format (new)
    if (Array.isArray(categoryPerms)) {
      return categoryPerms.includes(permission)
    } else if (typeof categoryPerms === 'object') {
      return Boolean(categoryPerms[permission])
    }
    
    return false
  }

  const hasRole = (requiredRole: 'viewer' | 'member' | 'admin' | 'owner'): boolean => {
    if (!currentMembership.value) return false
    
    const roleHierarchy = { viewer: 0, member: 1, admin: 2, owner: 3 }
    const userLevel = roleHierarchy[currentMembership.value.role]
    const requiredLevel = roleHierarchy[requiredRole]
    
    return userLevel >= requiredLevel
  }

  // Actions
  const loadWorkspaces = async () => {
    if (!authStore.isAuthenticated) {
      console.debug('Skipping workspace load - not authenticated')
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await safeTRPCQuery(
        () => trpc.tenant.list.query(),
        'Loading workspaces'
      ) as TenantWithMembership[]
      
      // Transform to clean frontend format
      workspaces.value = response.map(item => ({
        workspace: {
          id: item.id,
          name: item.name,
          slug: item.slug,
          email: item.email,
          status: item.status,
        },
        membership: item.membership,
      }))

      console.debug(`Loaded ${workspaces.value.length} workspaces`)
      
    } catch (err) {
      const errorMessage = (err as Error).message
      error.value = errorMessage
      console.error('Failed to load workspaces:', errorMessage)
    } finally {
      loading.value = false
    }
  }

  const selectWorkspace = (workspaceId: string): boolean => {
    const workspace = workspaces.value.find(w => w.workspace.id === workspaceId)
    
    if (!workspace) {
      console.error('Attempted to select non-existent workspace:', workspaceId)
      return false
    }

    console.debug('Selecting workspace:', { id: workspaceId, name: workspace.workspace.name })
    
    // Always clear any previous context first
    updateTRPCTenantContext(null)
    
    // Set the new workspace ID
    currentWorkspaceId.value = workspaceId
    
    // Persist selection
    localStorage.setItem('kibly_selected_tenant', workspaceId)
    
    // Update tRPC context with new workspace ID - force immediate update
    updateTRPCTenantContext(workspaceId)
    
    console.debug('Workspace selection complete:', { 
      workspaceId, 
      contextUpdated: true,
      timestamp: new Date().toISOString()
    })
    
    return true
  }

  const initializeWorkspaceData = async () => {
    if (!authStore.isAuthenticated) {
      console.debug('Skipping workspace initialization - not authenticated')
      return
    }

    console.debug('Initializing workspace data...')
    
    // Load all workspaces first
    await loadWorkspaces()

    // Try to restore previously selected workspace
    const storedWorkspaceId = localStorage.getItem('kibly_selected_tenant')
    
    console.debug('Workspace selection logic', {
      storedWorkspaceId,
      workspaceCount: workspaces.value.length,
      workspaceIds: workspaces.value.map(w => w.workspace.id),
      hasStoredWorkspace: storedWorkspaceId && workspaces.value.some(w => w.workspace.id === storedWorkspaceId)
    })
    
    if (storedWorkspaceId && workspaces.value.some(w => w.workspace.id === storedWorkspaceId)) {
      console.debug('Restoring previously selected workspace:', storedWorkspaceId)
      const success = selectWorkspace(storedWorkspaceId)
      console.debug('Workspace selection result:', success)
    } else if (workspaces.value.length === 1) {
      // Auto-select if only one workspace
      console.debug('Auto-selecting single workspace')
      const success = selectWorkspace(workspaces.value[0].workspace.id)
      console.debug('Auto-selection result:', success)
    } else if (storedWorkspaceId) {
      // Clear invalid stored workspace
      console.debug('Clearing invalid stored workspace ID')
      localStorage.removeItem('kibly_selected_tenant')
    }
  }

  const clearWorkspaceData = () => {
    console.debug('Clearing workspace data')
    workspaces.value = []
    currentWorkspaceId.value = null
    error.value = null
    localStorage.removeItem('kibly_selected_tenant')
    updateTRPCTenantContext(null)
  }

  // Watch auth state - only clear on logout, let app store handle initialization
  watch(
    () => authStore.isAuthenticated,
    async (isAuthenticated) => {
      if (!isAuthenticated) {
        console.debug('Auth lost, clearing workspace data')
        clearWorkspaceData()
      }
      // Don't initialize here - let app store handle initialization to avoid race conditions
    },
    { immediate: false }
  )

  return {
    // State
    workspaces: computed(() => workspaces.value),
    currentWorkspaceId: computed(() => currentWorkspaceId.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    
    // Computed
    current,
    currentWorkspace,
    currentMembership,
    hasWorkspaces,
    needsWorkspaceSelection,
    
    // Permissions
    hasPermission,
    hasRole,
    
    // Actions
    loadWorkspaces,
    selectWorkspace,
    initializeWorkspaceData,
    clearWorkspaceData,
  }
})

// For backward compatibility with existing code
export const useTenantStore = useWorkspaceStore