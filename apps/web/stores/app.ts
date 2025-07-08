export const useAppStore = defineStore('app', () => {
  const authStore = useAuthStore()
  
  const isInitialized = ref(false)
  const isLoading = ref(true)
  const error = ref<string | null>(null)

  async function initialize() {
    if (isInitialized.value) return
    
    try {
      isLoading.value = true
      error.value = null
      
      // Check if Supabase is available
      const { $supabase } = useNuxtApp()
      if (!$supabase) {
        console.warn('Supabase not initialized. Running in offline mode.')
        // You can still mark as initialized to allow the app to run
        isInitialized.value = true
        return
      }
      
      // Initialize auth
      await authStore.initialize()
      
      isInitialized.value = true
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Failed to initialize app'
      console.error('App initialization error:', err)
      // Don't re-throw the error to prevent app crash
      // The UI can show an error state based on the error ref
    } finally {
      isLoading.value = false
    }
  }

  async function reset() {
    isInitialized.value = false
    isLoading.value = false
    error.value = null
    
    // Reset auth store
    authStore.$reset()
  }

  return {
    isInitialized,
    isLoading,
    error,
    initialize,
    reset
  }
})