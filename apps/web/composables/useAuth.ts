import { withRetry } from '~/utils/retry'
import { isRetryableError } from '~/utils/auth-errors'

export const useAuth = () => {
  const user = useSupabaseUser()
  const supabase = useSupabaseClient()
  const isAuthReady = useState('auth.ready', () => false)
  
  // Loading states
  const isLoading = ref(false)
  const isInitializing = computed(() => !isAuthReady.value)
  
  // User state
  const isAuthenticated = computed(() => !!user.value)
  const userEmail = computed(() => user.value?.email || '')
  const userId = computed(() => user.value?.id || '')
  
  // Session state
  const sessionExpiry = ref<Date | null>(null)
  const isSessionExpired = computed(() => {
    if (!sessionExpiry.value) return false
    return new Date() >= sessionExpiry.value
  })
  
  // Wait for auth to be ready
  const waitForAuth = async (): Promise<boolean> => {
    if (isAuthReady.value) return true
    
    // Use the auth ready promise from the plugin
    const authReadyPromise = useState<Promise<void>>('auth.ready.promise')
    if (authReadyPromise.value) {
      try {
        await authReadyPromise.value
        return true
      } catch {
        return false
      }
    }
    
    // Fallback if promise doesn't exist
    return isAuthReady.value
  }
  
  // Get current session
  const getSession = async () => {
    return withRetry(
      async () => {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw error
        
        // Update session expiry
        if (data.session?.expires_at) {
          sessionExpiry.value = new Date(data.session.expires_at * 1000)
        }
        
        return data.session
      },
      {
        maxAttempts: 2,
        delay: 500,
        shouldRetry: (error) => isRetryableError(error)
      }
    )
  }
  
  // Refresh session manually
  const refreshSession = async () => {
    try {
      isLoading.value = true
      const { data, error } = await supabase.auth.refreshSession()
      if (error) throw error
      
      // Update session expiry
      if (data.session?.expires_at) {
        sessionExpiry.value = new Date(data.session.expires_at * 1000)
      }
      
      return data.session
    } finally {
      isLoading.value = false
    }
  }
  
  // Monitor session expiry
  onMounted(() => {
    // Check session on mount
    getSession().catch(() => {
      // Session check failed, ignore
    })
    
    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.expires_at) {
        sessionExpiry.value = new Date(session.expires_at * 1000)
      } else {
        sessionExpiry.value = null
      }
    })
    
    // Cleanup
    onUnmounted(() => {
      subscription.unsubscribe()
    })
  })
  
  // Ensure user is authenticated (for use in pages/components)
  const requireAuth = async () => {
    await waitForAuth()
    
    if (!isAuthenticated.value) {
      throw createError({
        statusCode: 401,
        statusMessage: 'Authentication required'
      })
    }
    
    return user.value
  }
  
  return {
    // State
    user: readonly(user),
    isLoading: readonly(isLoading),
    isInitializing,
    isAuthenticated,
    userEmail,
    userId,
    sessionExpiry: readonly(sessionExpiry),
    isSessionExpired,
    
    // Methods
    waitForAuth,
    getSession,
    refreshSession,
    requireAuth
  }
}