import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from './auth'
import { useWorkspaceStore } from './workspace'
import { useOAuthStore } from './oauth'
import { useSyncStore } from './sync'
import { useProviderStore } from './provider'
import { trpc, safeTRPCQuery } from '../lib/trpc'
import type { 
  Integration, 
  IntegrationProvider, 
  IntegrationType, 
  IntegrationSettings,
  IntegrationStatus,
  TestConnectionResponse,
  TriggerSyncResponse,
  OAuthUrlResponse
} from '@kibly/shared-types'

export interface XeroOrganisation {
  id: string
  name: string
  type?: string
  currency?: string
  status?: string
  version?: string
  isDemoCompany?: boolean
  countryCode?: string
}

export const useIntegrationStore = defineStore('integration', () => {
  // State
  const integrations = ref<Integration[]>([])
  const currentIntegration = ref<Integration | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  // Dependencies
  const authStore = useAuthStore()
  const workspaceStore = useWorkspaceStore()
  const oauthStore = useOAuthStore()
  const syncStore = useSyncStore()
  const providerStore = useProviderStore()

  // Getters
  const hasIntegrations = computed(() => integrations.value.length > 0)
  
  const activeIntegrations = computed(() => 
    integrations.value.filter(i => i.status === 'active')
  )
  
  const errorIntegrations = computed(() => 
    integrations.value.filter(i => i.status === 'error')
  )

  const integrationsByType = computed(() => {
    const groups: Record<IntegrationType, Integration[]> = {
      accounting: []
    }
    
    integrations.value.forEach(integration => {
      if (integration.integrationType === 'accounting') {
        groups[integration.integrationType].push(integration)
      }
    })
    
    return groups
  })

  const canCreateIntegration = computed(() => 
    workspaceStore.hasPermission('providers', 'create')
  )

  const canUpdateIntegrations = computed(() => 
    workspaceStore.hasPermission('providers', 'update')
  )

  const canManageCredentials = computed(() => 
    workspaceStore.hasPermission('providers', 'manageCredentials')
  )

  const supportedProviders = computed(() => 
    providerStore.supportedProviders
  )

  const oauthState = computed(() => 
    oauthStore.oauthState
  )

  // Actions
  const loadIntegrations = async () => {
    if (!authStore.isAuthenticated || !workspaceStore.currentWorkspaceId) {
      console.debug('Skipping integration load - auth or workspace not ready', {
        isAuthenticated: authStore.isAuthenticated,
        workspaceId: workspaceStore.currentWorkspaceId
      })
      return
    }

    loading.value = true
    error.value = null

    try {
      const response = await safeTRPCQuery(
        () => trpc.integration.list.query(),
        'Loading integrations'
      )
      
      // Transform backend response to frontend types
      integrations.value = (response as any[]).map(item => {
        // Handle case where data is wrapped in props object (from domain entities)
        const data = item.props || item
        return {
          ...data,
          capabilities: data.capabilities || {
            read: [],
            write: [],
            webhook: false,
            realtime: false,
            fileUpload: false,
            batchOperations: false
          }
        }
      }) as Integration[]
      
      console.debug(`Loaded ${integrations.value.length} integrations`)
      
    } catch (err) {
      const errorMessage = (err as Error).message
      error.value = errorMessage
      console.error('Failed to load integrations:', errorMessage)
    } finally {
      loading.value = false
    }
  }

  const getIntegration = async (id: string) => {
    loading.value = true
    error.value = null

    try {
      const integration = await trpc.integration.get.query({ integrationId: id })
      // Transform backend response to frontend type
      const data = (integration as any).props || integration
      currentIntegration.value = {
        ...data,
        capabilities: data.capabilities || {
          read: [],
          write: [],
          webhook: false,
          realtime: false,
          fileUpload: false,
          batchOperations: false
        }
      } as Integration
      return currentIntegration.value
    } catch (err) {
      error.value = (err as Error).message
      console.error('Failed to get integration:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const createIntegration = async (
    provider: IntegrationProvider,
    name: string,
    settings: IntegrationSettings = {}
  ) => {
    if (!canCreateIntegration.value) {
      throw new Error('Insufficient permissions to create integrations')
    }

    loading.value = true
    error.value = null

    try {
      const integration = await trpc.integration.create.mutate({
        provider,
        name,
        integrationType: 'accounting', // Currently only support accounting
        settings: settings as Record<string, unknown>
      })

      // Add to local state
      const data = (integration as any).props || integration
      integrations.value.push({
        ...data,
        capabilities: providerStore.getProviderCapabilities(provider)
      } as Integration)

      return integration
    } catch (err) {
      error.value = (err as Error).message
      console.error('Failed to create integration:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateIntegration = async (
    id: string, 
    updates: Partial<Pick<Integration, 'name' | 'settings'>>
  ) => {
    if (!canUpdateIntegrations.value) {
      throw new Error('Insufficient permissions to update integrations')
    }

    loading.value = true
    error.value = null

    try {
      const updated = await trpc.integration.update.mutate({
        integrationId: id,
        name: updates.name,
        settings: updates.settings as Record<string, unknown>
      })

      // Update local state
      const index = integrations.value.findIndex(i => i.id === id)
      if (index !== -1) {
        const data = (updated as any).props || updated
        integrations.value[index] = { 
          ...integrations.value[index], 
          ...data,
          capabilities: integrations.value[index].capabilities, // Preserve capabilities
          provider: integrations.value[index].provider // Preserve provider
        }
      }

      return updated
    } catch (err) {
      error.value = (err as Error).message
      console.error('Failed to update integration:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const deleteIntegration = async (id: string) => {
    if (!canUpdateIntegrations.value) {
      throw new Error('Insufficient permissions to delete integrations')
    }

    loading.value = true
    error.value = null

    try {
      await trpc.integration.delete.mutate({ integrationId: id })
      
      // Remove from local state
      integrations.value = integrations.value.filter(i => i.id !== id)
    } catch (err) {
      error.value = (err as Error).message
      console.error('Failed to delete integration:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const testConnection = async (id: string) => {
    if (!canManageCredentials.value) {
      throw new Error('Insufficient permissions to test connections')
    }

    loading.value = true
    error.value = null

    try {
      const success = await trpc.integration.testConnection.mutate({ integrationId: id })
      const result: TestConnectionResponse = { 
        success,
        message: success ? 'Connection successful' : 'Connection failed'
      }
      
      // Update the integration status in local state
      const integration = integrations.value.find(i => i.id === id)
      if (integration) {
        if (result.success) {
          integration.status = 'active'
          integration.health = {
            score: 100,
            lastCheck: new Date().toISOString(),
            issues: []
          }
          // Clear any previous error
          integration.lastError = undefined
        } else {
          // Check if re-authentication is required
          if (result.requiresReauth) {
            integration.status = 'setup_pending'
            integration.lastError = result.error || result.message || 'Authentication expired - please reconnect your integration'
            integration.health = {
              score: 0,
              lastCheck: new Date().toISOString(),
              issues: [{ 
                type: 'authentication_expired', 
                message: 'Your connection has expired. Please reconnect your integration to continue.',
                severity: 'high'
              }]
            }
            
            // Return a special error to indicate re-authentication is needed
            const authError = new Error(result.error || result.message || 'Authentication required - please reconnect your integration')
            authError.name = 'AuthenticationRequiredError'
            throw authError
          } else {
            integration.status = 'error'
            integration.lastError = result.error || result.message || 'Connection test failed'
            integration.health = {
              score: 0,
              lastCheck: new Date().toISOString(),
              issues: [{ 
                type: 'connection_failure', 
                message: result.error || result.message || 'Connection test failed',
                severity: 'high'
              }]
            }
          }
        }
      }

      return result
    } catch (err) {
      const errorMessage = (err as Error).message
      error.value = errorMessage
      
      // Enhanced error handling
      const integration = integrations.value.find(i => i.id === id)
      if (integration) {
        if (err instanceof Error && err.name === 'AuthenticationRequiredError') {
          console.warn(`🔑 Authentication required for integration ${id}:`, errorMessage)
          throw err
        }
        
        integration.status = 'error'
        integration.lastError = errorMessage
        
        // Categorise errors
        let errorType = 'unknown_error'
        let severity: 'low' | 'medium' | 'high' = 'high'
        
        if (errorMessage.includes('token') || errorMessage.includes('auth')) {
          errorType = 'authentication_error'
          severity = 'high'
        } else if (errorMessage.includes('permission')) {
          errorType = 'permission_error'
          severity = 'medium'
        } else if (errorMessage.includes('network') || errorMessage.includes('timeout')) {
          errorType = 'network_error'
          severity = 'medium'
        }
        
        integration.health = {
          score: 0,
          lastCheck: new Date().toISOString(),
          issues: [{ 
            type: errorType, 
            message: errorMessage,
            severity: severity as 'low' | 'medium' | 'high'
          }]
        }
      }
      
      console.error('Failed to test connection:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  const updateIntegrationStatus = (id: string, status: IntegrationStatus, error?: string) => {
    const integration = integrations.value.find(i => i.id === id)
    if (integration) {
      integration.status = status
      if (error) {
        integration.lastError = error
      }
      if (status === 'active') {
        integration.lastSyncAt = new Date().toISOString()
      }
    }
  }

  const initializeIntegrationData = async () => {
    if (!authStore.isAuthenticated || !workspaceStore.currentWorkspaceId) {
      console.debug('Skipping integration initialization - not ready', {
        isAuthenticated: authStore.isAuthenticated,
        workspaceId: workspaceStore.currentWorkspaceId
      })
      return
    }

    console.debug('Initializing integration data...')
    
    // Load integrations and providers in parallel
    await Promise.all([
      loadIntegrations(),
      providerStore.loadSupportedProviders()
    ])
  }

  const clearIntegrationData = () => {
    integrations.value = []
    currentIntegration.value = null
    error.value = null
    oauthStore.reset()
    syncStore.clearSyncData()
    providerStore.clearProviderData()
  }

  const getIntegrationHealth = (integration: Integration) => {
    if (!integration.health) return { status: 'unknown', message: 'Health data not available' }

    const { score, issues, lastCheck } = integration.health
    const timeSinceCheck = Date.now() - new Date(lastCheck).getTime()
    const hoursOld = timeSinceCheck / (1000 * 60 * 60)

    if (score >= 90 && issues.length === 0) {
      return { status: 'healthy', message: 'Connection is working well' }
    } else if (score >= 70) {
      return { status: 'warning', message: `${issues.length} minor issues detected` }
    } else if (hoursOld > 24) {
      return { status: 'stale', message: 'Health check data is outdated' }
    } else {
      return { status: 'error', message: `${issues.length} issues need attention` }
    }
  }

  const updateOAuthState = (state: any) => {
    return oauthStore.updateOAuthState(state)
  }

  const startOAuthFlow = async (provider: IntegrationProvider, name: string, settings?: IntegrationSettings): Promise<OAuthUrlResponse> => {
    // Save OAuth state and get auth URL
    oauthStore.saveOAuthState(provider, `${window.location.origin}/integrations/oauth/callback`)
    const response = await trpc.integration.getAuthUrl.query({
      provider,
      redirectUri: `${window.location.origin}/integrations/oauth/callback`
    })
    // Map the response to match OAuthUrlResponse interface
    return {
      authUrl: response.url,
      state: response.state
    }
  }

  const reconnectIntegration = async (id: string) => {
    // This would trigger the OAuth flow again for an existing integration
    const integration = integrations.value.find(i => i.id === id)
    if (!integration) {
      throw new Error('Integration not found')
    }
    return startOAuthFlow(integration.provider, integration.name, integration.settings)
  }

  const getSyncStatistics = () => {
    return syncStore.getSyncStatistics()
  }

  const completeOAuthFlow = async (code: string, state: string) => {
    return oauthStore.completeOAuthFlow(code, state)
  }

  const fetchAvailableOrganisations = async (integrationId: string) => {
    // This would fetch organisations from the provider
    return trpc.integration.getAuthUrl.query({ provider: 'xero', redirectUri: `${window.location.origin}/integrations/oauth/callback` })
  }

  const completeOAuthFlowWithOrganisation = async (integrationId: string, organisationId: string) => {
    // This would complete the OAuth flow with a selected organisation
    return trpc.integration.completeAuth.mutate({ 
      provider: 'xero', 
      code: integrationId, 
      state: organisationId 
    })
  }

  return {
    // State
    integrations: computed(() => integrations.value),
    currentIntegration: computed(() => currentIntegration.value),
    loading: computed(() => loading.value),
    error: computed(() => error.value),

    // Getters
    hasIntegrations,
    activeIntegrations,
    errorIntegrations,
    integrationsByType,
    canCreateIntegration,
    canUpdateIntegrations,
    canManageCredentials,
    supportedProviders,
    oauthState,

    // Actions
    loadIntegrations,
    getIntegration,
    createIntegration,
    updateIntegration,
    deleteIntegration,
    testConnection,
    updateIntegrationStatus,
    initializeIntegrationData,
    clearIntegrationData,
    getIntegrationHealth,
    updateOAuthState,
    startOAuthFlow,
    reconnectIntegration,
    getSyncStatistics,
    completeOAuthFlow,
    fetchAvailableOrganisations,
    completeOAuthFlowWithOrganisation,

    // Re-export commonly used actions from other stores for convenience
    triggerSync: syncStore.triggerSync,
    getSyncJobs: syncStore.getSyncJobs
  }
})