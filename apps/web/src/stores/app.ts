import { defineStore } from 'pinia'
import { ref, computed, watch } from 'vue'
import { useAuthStore } from './auth'
import { useWorkspaceStore } from './workspace'
import { useIntegrationStore } from './integration'

export type AppPhase = 'uninitialized' | 'initializing' | 'ready' | 'error'

export interface AppError {
  phase: AppPhase
  message: string
  details?: unknown
  timestamp: string
}

/**
 * Master application state store
 * Orchestrates initialization of all application modules in correct order
 */
export const useAppStore = defineStore('app', () => {
  // State
  const phase = ref<AppPhase>('uninitialized')
  const initializationError = ref<AppError | null>(null)
  const isHydrated = ref(false)
  
  // Phase tracking for debugging
  const initializationLog = ref<Array<{ phase: string; timestamp: string; success: boolean }>>([])

  // Dependencies - these will be initialized in order
  const authStore = useAuthStore()
  const workspaceStore = useWorkspaceStore()
  const integrationStore = useIntegrationStore()

  // Computed
  const isReady = computed(() => phase.value === 'ready')
  const isInitializing = computed(() => phase.value === 'initializing')
  const hasError = computed(() => phase.value === 'error')
  const isUninitialized = computed(() => phase.value === 'uninitialized')

  // Current workspace shorthand for easy access
  const workspace = computed(() => workspaceStore.currentWorkspace)
  const workspaceId = computed(() => workspaceStore.currentWorkspaceId)
  const user = computed(() => authStore.user)
  const isAuthenticated = computed(() => authStore.isAuthenticated)

  // Loading states
  const isLoading = computed(() => 
    authStore.loading || 
    workspaceStore.loading || 
    integrationStore.loading ||
    isInitializing.value
  )

  // Error aggregation
  const errors = computed(() => {
    const errs: string[] = []
    if (initializationError.value) errs.push(initializationError.value.message)
    if (authStore.error) errs.push(`Auth: ${authStore.error}`)
    if (workspaceStore.error) errs.push(`Workspace: ${workspaceStore.error}`)
    if (integrationStore.error) errs.push(`Integrations: ${integrationStore.error}`)
    return errs
  })

  const hasAnyError = computed(() => errors.value.length > 0)

  // Utility functions
  const logPhase = (phaseName: string, success: boolean = true) => {
    initializationLog.value.push({
      phase: phaseName,
      timestamp: new Date().toISOString(),
      success
    })
    console.debug(`App initialization: ${phaseName} ${success ? 'completed' : 'failed'}`)
  }

  const setError = (phaseName: AppPhase, message: string, details?: unknown) => {
    initializationError.value = {
      phase: phaseName,
      message,
      details,
      timestamp: new Date().toISOString()
    }
    phase.value = 'error'
    logPhase(phaseName, false)
    console.error(`App initialization failed at ${phaseName}:`, message, details)
  }

  // Core initialization function
  const initialize = async (force: boolean = false) => {
    if ((isReady.value || isInitializing.value) && !force) {
      console.debug('App already initialized or initializing, skipping')
      return
    }

    console.log('🚀 Starting application initialization...')
    phase.value = 'initializing'
    initializationError.value = null
    initializationLog.value = []

    // Clear any stale tRPC tenant context that might be cached
    console.debug('Clearing stale tRPC context')
    const { updateTRPCTenantContext } = await import('../lib/trpc-reactive')
    updateTRPCTenantContext(null)

    try {
      // Phase 1: Initialize Authentication
      logPhase('auth-start')
      if (!authStore.initialized) {
        await authStore.initAuth()
      }
      
      // Verify auth state
      if (!authStore.isAuthenticated) {
        logPhase('auth-not-authenticated')
        phase.value = 'ready' // Ready but not authenticated
        return
      }
      logPhase('auth-complete')

      // Phase 2: Initialize Workspace Data
      logPhase('workspace-start')
      await workspaceStore.initializeWorkspaceData()
      
      // Check if we have any workspaces
      if (!workspaceStore.hasWorkspaces) {
        logPhase('workspace-none-found')
        phase.value = 'ready' // Ready but no workspaces
        return
      }

      // If no workspace is selected but we have workspaces, this is handled by route guards
      logPhase('workspace-complete')

      // Phase 3: Initialize Integration Data (only if workspace selected)
      if (workspaceStore.currentWorkspaceId) {
        logPhase('integrations-start')
        await integrationStore.initializeIntegrationData()
        logPhase('integrations-complete')
      } else {
        logPhase('integrations-skipped-no-workspace')
      }

      // All phases complete
      phase.value = 'ready'
      isHydrated.value = true
      console.log('✅ Application initialization complete')
      
    } catch (error) {
      console.error('❌ Application initialization failed:', error)
      setError('initializing', 'Failed to initialize application', error)
      throw error
    }
  }

  // Re-initialize integrations when workspace changes
  const reinitializeForWorkspace = async () => {
    if (!isReady.value) return
    
    console.debug('🔄 Reinitializing for workspace change...')
    
    try {
      // Clear integration data first
      integrationStore.clearIntegrationData()
      
      // Load new integration data if we have a workspace
      if (workspaceStore.currentWorkspaceId) {
        await integrationStore.initializeIntegrationData()
      }
      
      console.debug('✅ Workspace reinitialization complete')
    } catch (error) {
      console.error('❌ Workspace reinitialization failed:', error)
      setError('ready', 'Failed to reinitialize for workspace change', error)
    }
  }

  // Watch for workspace changes and reinitialize integrations
  watch(
    () => workspaceStore.currentWorkspaceId,
    async (newWorkspaceId, oldWorkspaceId) => {
      console.debug('Workspace changed in app store', { newWorkspaceId, oldWorkspaceId, phase: phase.value })
      
      // Only reinitialize if app is ready and workspace actually changed
      if (isReady.value && newWorkspaceId !== oldWorkspaceId) {
        await reinitializeForWorkspace()
      }
    }
  )

  // Reset function for logout
  const reset = () => {
    console.log('🔄 Resetting application state...')
    phase.value = 'uninitialized'
    initializationError.value = null
    initializationLog.value = []
    isHydrated.value = false
    
    // Reset all stores
    integrationStore.clearIntegrationData()
    // Note: auth and tenant stores handle their own reset
  }

  // Debug helpers
  const getDebugInfo = () => ({
    phase: phase.value,
    isReady: isReady.value,
    isAuthenticated: authStore.isAuthenticated,
    workspaceId: workspaceStore.currentWorkspaceId,
    workspaceName: workspace.value?.name,
    integrationCount: integrationStore.integrations.length,
    errors: errors.value,
    initializationLog: initializationLog.value
  })

  return {
    // State
    phase: computed(() => phase.value),
    initializationError: computed(() => initializationError.value),
    isHydrated: computed(() => isHydrated.value),
    
    // Status
    isReady,
    isInitializing,
    hasError,
    isUninitialized,
    isLoading,
    hasAnyError,
    
    // Convenient access
    workspace,
    workspaceId,
    user,
    isAuthenticated,
    errors,
    
    // Actions
    initialize,
    reinitializeForWorkspace,
    reset,
    
    // Debug
    getDebugInfo,
    initializationLog: computed(() => initializationLog.value)
  }
})