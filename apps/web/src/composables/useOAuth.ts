import { ref, computed } from 'vue'
import { useIntegrationStore } from '../stores/integration'
import type { IntegrationProvider, IntegrationSettings } from '@kibly/shared-types'

/**
 * Composable for managing OAuth flows
 * Handles popup-based OAuth authentication for integrations
 */
export function useOAuth() {
  const integrationStore = useIntegrationStore()
  
  const isProcessing = ref(false)
  const currentProvider = ref<IntegrationProvider | null>(null)
  const oauthWindow = ref<Window | null>(null)
  const pollInterval = ref<NodeJS.Timeout | null>(null)

  // Computed properties
  const oauthState = computed(() => integrationStore.oauthState)
  const isOAuthActive = computed(() => !!oauthState.value && isProcessing.value)

  /**
   * Start OAuth flow in a popup window
   */
  const startOAuthFlow = async (
    provider: IntegrationProvider,
    integrationName: string,
    settings: IntegrationSettings = {}
  ) => {
    if (isProcessing.value) {
      throw new Error('OAuth flow already in progress')
    }

    try {
      isProcessing.value = true
      currentProvider.value = provider

      // Get auth URL from backend
      const authResponse = await integrationStore.startOAuthFlow(provider, integrationName, settings)

      // Open popup window
      const popup = window.open(
        authResponse.authUrl,
        `oauth_${provider}`,
        'width=600,height=700,scrollbars=yes,resizable=yes,status=yes'
      )

      if (!popup) {
        throw new Error('Failed to open OAuth popup. Please check your popup blocker settings.')
      }

      oauthWindow.value = popup

      // Poll for OAuth completion
      return new Promise<any>((resolve, reject) => {
        pollInterval.value = setInterval(async () => {
          try {
            // Check if popup was closed manually
            if (popup.closed) {
              clearInterval(pollInterval.value!)
              isProcessing.value = false
              currentProvider.value = null
              reject(new Error('OAuth flow was cancelled by user'))
              return
            }

            // Check if we're on the callback URL
            let currentUrl: string
            try {
              currentUrl = popup.location.href
            } catch (error) {
              // Cross-origin error means we're still on OAuth provider's domain
              return
            }

            console.log('🔍 OAuth popup URL:', currentUrl)

            // Parse callback URL for OAuth code and state
            const url = new URL(currentUrl)
            const code = url.searchParams.get('code')
            const state = url.searchParams.get('state')
            const error = url.searchParams.get('error')

            console.log('🔍 OAuth parameters from popup:', { code: !!code, state: !!state, error })

            if (error) {
              console.error('❌ OAuth error in popup:', error)
              clearInterval(pollInterval.value!)
              popup.close()
              isProcessing.value = false
              currentProvider.value = null
              reject(new Error(`OAuth error: ${error}`))
              return
            }

            if (code && state) {
              console.log('✅ OAuth parameters received, detecting flow type...')
              clearInterval(pollInterval.value!)
              popup.close()

              // For Xero (and other providers that need organisation selection),
              // don't complete automatically - let the redirect flow handle it
              if (currentProvider.value === 'xero') {
                console.log('🔄 Xero OAuth detected - storing code/state and letting redirect flow handle organisation selection')
                
                // Store the code and state in localStorage for manual progression
                const storedState = localStorage.getItem('oauth_state')
                if (storedState) {
                  try {
                    const currentState = JSON.parse(storedState)
                    const updatedState = {
                      ...currentState,
                      code,
                      state
                    }
                    localStorage.setItem('oauth_state', JSON.stringify(updatedState))
                    console.log('💾 Updated localStorage OAuth state with code and state for manual progression')
                  } catch (err) {
                    console.error('❌ Failed to update OAuth state with code/state:', err)
                  }
                }
                
                isProcessing.value = false
                currentProvider.value = null
                resolve({ 
                  success: true, 
                  message: 'OAuth completed - redirecting for organisation selection',
                  requiresOrganisationSelection: true,
                  code,
                  state
                })
                return
              }

              try {
                // For other providers that don't need organisation selection
                const integration = await integrationStore.completeOAuthFlow(code, state)
                isProcessing.value = false
                currentProvider.value = null
                resolve(integration)
              } catch (err) {
                console.error('❌ OAuth completion failed:', err)
                isProcessing.value = false
                currentProvider.value = null
                reject(err)
              }
            }
          } catch (error) {
            // Ignore cross-origin errors during polling
            if (error instanceof DOMException && error.name === 'SecurityError') {
              return
            }
            console.error('OAuth polling error:', error)
          }
        }, 1000) // Poll every second
      })
    } catch (error) {
      isProcessing.value = false
      currentProvider.value = null
      throw error
    }
  }

  /**
   * Cancel the current OAuth flow
   */
  const cancelOAuthFlow = () => {
    if (pollInterval.value) {
      clearInterval(pollInterval.value)
      pollInterval.value = null
    }

    if (oauthWindow.value && !oauthWindow.value.closed) {
      oauthWindow.value.close()
    }

    isProcessing.value = false
    currentProvider.value = null
    oauthWindow.value = null
  }

  /**
   * Handle OAuth callback manually (for redirect-based flows)
   */
  const handleOAuthCallback = async (code: string, state: string) => {
    try {
      isProcessing.value = true
      const integration = await integrationStore.completeOAuthFlow(code, state)
      isProcessing.value = false
      return integration
    } catch (error) {
      isProcessing.value = false
      throw error
    }
  }

  /**
   * Fetch available organisations for organisation selection
   */
  const fetchAvailableOrganisations = async (code: string, state: string) => {
    try {
      isProcessing.value = true
      const organisations = await integrationStore.fetchAvailableOrganisations(code)
      isProcessing.value = false
      return organisations
    } catch (error) {
      isProcessing.value = false
      throw error
    }
  }

  /**
   * Complete OAuth flow with selected organisation
   */
  const completeOAuthWithOrganisation = async (integrationId: string, organisationId: string) => {
    try {
      isProcessing.value = true
      const integration = await integrationStore.completeOAuthFlowWithOrganisation(integrationId, organisationId)
      isProcessing.value = false
      return integration
    } catch (error) {
      isProcessing.value = false
      throw error
    }
  }

  /**
   * Check if OAuth is supported for a provider
   */
  const isOAuthSupported = (provider: IntegrationProvider): boolean => {
    const supportedProviders = integrationStore.supportedProviders
    const providerInfo = supportedProviders.find((p: any) => p.provider === provider)
    return !!providerInfo?.isAvailable
  }

  /**
   * Get OAuth status message for UI
   */
  const getOAuthStatusMessage = (): string => {
    if (!isProcessing.value) return ''
    
    if (currentProvider.value) {
      return `Connecting to ${currentProvider.value}...`
    }
    
    return 'Starting OAuth flow...'
  }

  /**
   * Cleanup function for component unmount
   */
  const cleanup = () => {
    cancelOAuthFlow()
  }

  return {
    // State
    isProcessing: computed(() => isProcessing.value),
    currentProvider: computed(() => currentProvider.value),
    oauthState,
    isOAuthActive,

    // Actions
    startOAuthFlow,
    cancelOAuthFlow,
    handleOAuthCallback,
    fetchAvailableOrganisations,
    completeOAuthWithOrganisation,
    
    // Helpers
    isOAuthSupported,
    getOAuthStatusMessage,
    cleanup,
  }
}