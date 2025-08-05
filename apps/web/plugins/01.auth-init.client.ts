export default defineNuxtPlugin(async () => {
  const supabase = useSupabaseClient()
  
  // Create a reactive auth ready state and promise
  const isAuthReady = useState('auth.ready', () => false)
  const authReadyPromise = useState<Promise<void>>('auth.ready.promise')
  
  // Create the promise if it doesn't exist
  if (!authReadyPromise.value) {
    authReadyPromise.value = new Promise<void>((resolve) => {
      let resolved = false
      
      // Check if we already have a session
      supabase.auth.getSession().then(() => {
        if (!resolved) {
          isAuthReady.value = true
          resolved = true
          resolve()
        }
      }).catch(() => {
        // Even if session check fails, mark as ready
        if (!resolved) {
          isAuthReady.value = true
          resolved = true
          resolve()
        }
      })
      
      // Set a timeout to ensure we don't wait forever
      setTimeout(() => {
        if (!resolved) {
          isAuthReady.value = true
          resolved = true
          resolve()
        }
      }, 3000)
      
      // Also listen for auth state changes
      const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
        // Mark auth as ready on first state change
        if (!resolved) {
          isAuthReady.value = true
          resolved = true
          resolve()
        }
      })
      
      // Cleanup on unmount
      if (process.client) {
        const cleanup = () => subscription.unsubscribe()
        window.addEventListener('beforeunload', cleanup)
      }
    })
  }
  
  // Wait for auth to be ready before continuing
  await authReadyPromise.value
})