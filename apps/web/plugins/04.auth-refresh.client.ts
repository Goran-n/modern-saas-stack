export default defineNuxtPlugin(() => {
  const supabase = useSupabaseClient()
  
  // Set up automatic token refresh
  let refreshTimer: NodeJS.Timeout | null = null
  
  const scheduleTokenRefresh = (expiresAt: number) => {
    // Clear any existing timer
    if (refreshTimer) {
      clearTimeout(refreshTimer)
    }
    
    // Calculate when to refresh (5 minutes before expiry)
    const refreshTime = (expiresAt * 1000) - Date.now() - (5 * 60 * 1000)
    
    if (refreshTime > 0) {
      refreshTimer = setTimeout(async () => {
        try {
          const { data, error } = await supabase.auth.refreshSession()
          if (error) {
            console.error('Failed to refresh session:', error)
            // Navigate to login if refresh fails
            await navigateTo('/auth/login')
          } else if (data.session) {
            // Schedule next refresh
            scheduleTokenRefresh(data.session.expires_at!)
          }
        } catch (error) {
          console.error('Error refreshing session:', error)
        }
      }, refreshTime)
    }
  }
  
  // Listen for auth state changes to set up refresh
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
      if (session?.expires_at) {
        scheduleTokenRefresh(session.expires_at)
      }
    } else if (event === 'SIGNED_OUT') {
      // Clear refresh timer on sign out
      if (refreshTimer) {
        clearTimeout(refreshTimer)
        refreshTimer = null
      }
    }
  })
  
  // Check current session on initialization
  supabase.auth.getSession().then(({ data }) => {
    if (data.session?.expires_at) {
      scheduleTokenRefresh(data.session.expires_at)
    }
  })
  
  // Cleanup on unmount
  if (process.client) {
    const cleanup = () => {
      if (refreshTimer) {
        clearTimeout(refreshTimer)
      }
    }
    
    window.addEventListener('beforeunload', cleanup)
  }
})