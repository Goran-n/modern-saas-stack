import { computed } from 'vue'
import { useAppStore } from '../stores/app'

/**
 * Simple composable for accessing application state
 * Provides a clean API for components to access centralized state
 */
export function useApp() {
  const appStore = useAppStore()

  return {
    // Application readiness
    isReady: appStore.isReady,
    isInitializing: appStore.isInitializing,
    hasError: appStore.hasError,
    isLoading: appStore.isLoading,
    
    // User & workspace
    user: appStore.user,
    isAuthenticated: appStore.isAuthenticated,
    workspace: appStore.workspace,
    workspaceId: appStore.workspaceId,
    
    // Errors
    errors: appStore.errors,
    hasAnyError: appStore.hasAnyError,
    
    // Actions
    initialize: appStore.initialize,
    reset: appStore.reset,
    
    // Debug
    getDebugInfo: appStore.getDebugInfo,
    phase: appStore.phase,
  }
}

/**
 * Utility composable to ensure app is initialized
 * Use this in components that need the app to be ready
 */
export function useAppInitialization() {
  const app = useApp()
  
  const ensureInitialized = async () => {
    if (!app.isReady && !app.isInitializing) {
      await app.initialize()
    }
  }
  
  const isReadyForWorkspace = computed(() => 
    app.isReady && app.isAuthenticated && !!app.workspace
  )
  
  const needsWorkspaceSelection = computed(() =>
    app.isReady && app.isAuthenticated && !app.workspace
  )
  
  const needsAuthentication = computed(() =>
    app.isReady && !app.isAuthenticated
  )
  
  return {
    ...app,
    ensureInitialized,
    isReadyForWorkspace,
    needsWorkspaceSelection,
    needsAuthentication,
  }
}