import { computed } from 'vue'
import { useIntegrationStore } from '../stores/integration'
import { useWorkspaceStore } from '../stores/workspace'
import type { IntegrationProvider, IntegrationSettings } from '@kibly/shared-types'

/**
 * Composable for managing integrations
 * Provides reactive integration data and actions
 * 
 * Note: Integration loading is now managed by the app store
 * This composable just provides convenient access to integration state
 */
export function useIntegrations() {
  const integrationStore = useIntegrationStore()
  const workspaceStore = useWorkspaceStore()

  // Computed properties for easy access
  const integrations = computed(() => integrationStore.integrations)
  const activeIntegrations = computed(() => integrationStore.activeIntegrations)
  const errorIntegrations = computed(() => integrationStore.errorIntegrations)
  const integrationsByType = computed(() => integrationStore.integrationsByType)
  const supportedProviders = computed(() => integrationStore.supportedProviders)
  const hasIntegrations = computed(() => integrationStore.hasIntegrations)
  const loading = computed(() => integrationStore.loading)
  const error = computed(() => integrationStore.error)

  // Permission checks
  const canCreate = computed(() => integrationStore.canCreateIntegration)
  const canUpdate = computed(() => integrationStore.canUpdateIntegrations)
  const canManage = computed(() => integrationStore.canManageCredentials)

  // Actions
  const refresh = () => integrationStore.loadIntegrations()
  const initialize = () => integrationStore.initializeIntegrationData()
  
  const getIntegration = (id: string) => integrationStore.getIntegration(id)
  
  const testConnection = (id: string) => integrationStore.testConnection(id)
  
  const updateIntegration = (id: string, updates: Partial<{
    name: string
    settings: IntegrationSettings
    status: 'active' | 'inactive'
  }>) => integrationStore.updateIntegration(id, updates)
  
  const deleteIntegration = (id: string) => integrationStore.deleteIntegration(id)
  
  const triggerSync = (id: string, type: 'full' | 'incremental' = 'incremental') => 
    integrationStore.triggerSync(id, type)

  const reconnectIntegration = (integration: any) => 
    integrationStore.reconnectIntegration(integration)

  const getSyncJobs = (integrationId: string) => 
    integrationStore.getSyncJobs(integrationId)

  const getSyncStatistics = () => 
    integrationStore.getSyncStatistics()

  // Health helpers
  const getHealth = (integration: any) => integrationStore.getIntegrationHealth(integration)
  
  const getHealthStatus = (integration: any) => {
    const health = getHealth(integration)
    return health.status
  }

  const getHealthMessage = (integration: any) => {
    const health = getHealth(integration)
    return health.message
  }

  // Filtering and searching
  const filterByStatus = (status: 'active' | 'inactive' | 'error' | 'pending') =>
    computed(() => integrations.value.filter(i => i.status === status))

  const filterByProvider = (provider: IntegrationProvider) =>
    computed(() => integrations.value.filter(i => i.provider === provider))

  const searchIntegrations = (query: string) =>
    computed(() => {
      if (!query.trim()) return integrations.value
      const lowercaseQuery = query.toLowerCase()
      return integrations.value.filter(i => 
        i.name.toLowerCase().includes(lowercaseQuery) ||
        i.provider.toLowerCase().includes(lowercaseQuery)
      )
    })

  return {
    // Data
    integrations,
    activeIntegrations,
    errorIntegrations,
    integrationsByType,
    supportedProviders,
    hasIntegrations,
    loading,
    error,

    // Permissions
    canCreate,
    canUpdate,
    canManage,

    // Actions
    refresh,
    initialize,
    getIntegration,
    testConnection,
    updateIntegration,
    deleteIntegration,
    triggerSync,
    reconnectIntegration,
    getSyncJobs,
    getSyncStatistics,

    // Health
    getHealth,
    getHealthStatus,
    getHealthMessage,

    // Filtering
    filterByStatus,
    filterByProvider,
    searchIntegrations,
  }
}