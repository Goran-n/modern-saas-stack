import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
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

// Frontend interface for easier use
export interface TenantMembership {
  tenant: {
    id: string
    name: string
    slug: string
    email: string
    status: 'active' | 'suspended' | 'deleted'
  }
  membership: {
    id: string
    role: 'viewer' | 'member' | 'admin' | 'owner'
    status: 'pending' | 'active' | 'suspended' | 'removed'
    permissions: Record<string, unknown>
    joinedAt: string
    lastAccessAt?: string
  }
}

export const useTenantStore = defineStore('tenant', () => {
  // State
  const tenantMemberships = ref<TenantMembership[]>([])
  const currentTenantId = ref<string | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Dependencies
  const authStore = useAuthStore()

  // Getters
  const currentTenant = computed(() => {
    if (!currentTenantId.value) return null
    const membership = tenantMemberships.value.find(
      m => m.tenant.id === currentTenantId.value
    )
    return membership?.tenant ?? null
  })

  const currentMembership = computed(() => {
    if (!currentTenantId.value) return null
    const membership = tenantMemberships.value.find(
      m => m.tenant.id === currentTenantId.value
    )
    return membership?.membership ?? null
  })

  const currentRole = computed(() => currentMembership.value?.role ?? null)

  const hasTenantsAccess = computed(() => tenantMemberships.value.length > 0)

  // Actions
  const loadTenantMemberships = async () => {
    if (!authStore.isAuthenticated) return

    loading.value = true
    error.value = null

    try {
      // Load user's tenant memberships from API
      const apiResponse = await trpc.tenant.list.query() as TenantWithMembership[]
      
      // Transform API response to frontend format
      tenantMemberships.value = apiResponse.map(item => ({
        tenant: {
          id: item.id,
          name: item.name,
          slug: item.slug,
          email: item.email,
          status: item.status,
        },
        membership: item.membership,
      }))
    } catch (err) {
      error.value = (err as Error).message
      console.error('Failed to load tenant memberships:', err)
    } finally {
      loading.value = false
    }
  }

  const switchTenant = (tenantId: string) => {
    const membership = tenantMemberships.value.find(m => m.tenant.id === tenantId)
    if (membership) {
      currentTenantId.value = tenantId
      // Persist selection in localStorage
      localStorage.setItem('kibly_selected_tenant', tenantId)
      return true
    }
    return false
  }

  const initializeTenantData = async () => {
    if (!authStore.isAuthenticated) return

    await loadTenantMemberships()

    // Restore previously selected tenant
    const storedTenantId = localStorage.getItem('kibly_selected_tenant')
    if (storedTenantId && tenantMemberships.value.some(m => m.tenant.id === storedTenantId)) {
      currentTenantId.value = storedTenantId
    } else if (tenantMemberships.value.length === 1) {
      // Auto-select if user has only one tenant
      currentTenantId.value = tenantMemberships.value[0].tenant.id
      localStorage.setItem('kibly_selected_tenant', currentTenantId.value)
    }
  }

  const createWorkspace = async (name: string, email?: string) => {
    if (!authStore.isAuthenticated) {
      throw new Error('Must be authenticated to create workspace')
    }

    loading.value = true
    error.value = null

    try {
      // Create new tenant via API
      const newTenant = await trpc.tenant.create.mutate({
        name: name.trim(),
        email: email || authStore.userEmail || '',
      })

      // Reload memberships to include the new tenant
      await loadTenantMemberships()

      // Auto-select the new workspace
      switchTenant(newTenant.id)

      return newTenant
    } catch (err) {
      error.value = (err as Error).message
      console.error('Failed to create workspace:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const clearTenantData = () => {
    tenantMemberships.value = []
    currentTenantId.value = null
    localStorage.removeItem('kibly_selected_tenant')
  }

  // Permission helpers
  const hasPermission = (category: string, action: string): boolean => {
    const permissions = currentMembership.value?.permissions
    if (!permissions) return false
    
    const categoryPermissions = permissions[category]
    if (!categoryPermissions) return false
    
    return (categoryPermissions as Record<string, boolean>)[action] ?? false
  }

  return {
    // State
    tenantMemberships: computed(() => tenantMemberships.value),
    currentTenantId: computed(() => currentTenantId.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),
    
    // Getters
    currentTenant,
    currentMembership,
    currentRole,
    hasTenantsAccess,
    
    // Actions
    loadTenantMemberships,
    createWorkspace,
    switchTenant,
    initializeTenantData,
    clearTenantData,
    hasPermission,
  }
})