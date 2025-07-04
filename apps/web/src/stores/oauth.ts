import { defineStore } from 'pinia'
import { ref } from 'vue'
import { useLocalStorage } from '../composables/useLocalStorage'
import type { OAuthState, OrganisationOption } from '../types/shared'

export const useOAuthStore = defineStore('oauth', () => {
  // State
  const isProcessing = ref(false)
  const error = ref<string | null>(null)
  const selectedOrganisationId = ref<string | null>(null)
  const availableOrganisations = ref<OrganisationOption[]>([])
  
  // Use localStorage composable for OAuth state persistence
  const oauthState = useLocalStorage<OAuthState | null>('oauth-state', null)

  // Actions
  const saveOAuthState = (provider: string, redirectUri: string) => {
    oauthState.value = {
      provider,
      redirectUri,
      timestamp: Date.now()
    }
  }

  const getOAuthState = (): OAuthState | null => {
    const state = oauthState.value
    if (!state) return null

    // Check if state is expired (older than 30 minutes)
    const thirtyMinutes = 30 * 60 * 1000
    if (Date.now() - state.timestamp > thirtyMinutes) {
      clearOAuthState()
      return null
    }

    return state
  }

  const clearOAuthState = () => {
    oauthState.value = null
  }

  const setOrganisations = (orgs: OrganisationOption[]) => {
    availableOrganisations.value = orgs
    // Auto-select primary organisation if available
    const primaryOrg = orgs.find(org => org.isPrimary)
    if (primaryOrg) {
      selectedOrganisationId.value = primaryOrg.id
    }
  }

  const selectOrganisation = (organisationId: string) => {
    selectedOrganisationId.value = organisationId
  }

  const startProcessing = () => {
    isProcessing.value = true
    error.value = null
  }

  const stopProcessing = () => {
    isProcessing.value = false
  }

  const setError = (errorMessage: string) => {
    error.value = errorMessage
    isProcessing.value = false
  }

  const clearError = () => {
    error.value = null
  }

  const reset = () => {
    isProcessing.value = false
    error.value = null
    selectedOrganisationId.value = null
    availableOrganisations.value = []
    clearOAuthState()
  }

  const updateOAuthState = (state: any) => {
    oauthState.value = {
      ...oauthState.value,
      ...state,
      timestamp: Date.now()
    }
  }

  const completeOAuthFlow = async (code: string, state: string) => {
    // This would complete the OAuth flow
    startProcessing()
    try {
      // Implementation would go here
      return { success: true }
    } catch (err) {
      setError((err as Error).message)
      throw err
    } finally {
      stopProcessing()
    }
  }

  return {
    // State
    isProcessing,
    error,
    selectedOrganisationId,
    availableOrganisations,
    oauthState,
    
    // Actions
    saveOAuthState,
    getOAuthState,
    clearOAuthState,
    setOrganisations,
    selectOrganisation,
    startProcessing,
    stopProcessing,
    setError,
    clearError,
    reset,
    updateOAuthState,
    completeOAuthFlow
  }
})