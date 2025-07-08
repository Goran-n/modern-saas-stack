export default defineNuxtPlugin(async (nuxtApp) => {
  const appStore = useAppStore()
  const router = useRouter()
  
  // Initialize app on first load
  nuxtApp.hook('app:mounted', async () => {
    try {
      await appStore.initialize()
    } catch (error) {
      console.error('Failed to initialize app:', error)
      
      // Check if it's a Supabase configuration error
      if (error instanceof Error && error.message.includes('Supabase')) {
        console.error('Supabase configuration error. Please check your environment variables.')
        // You might want to show a user-friendly error page instead
      }
      
      // If initialization fails and app is not initialized, redirect to login
      if (!appStore.isInitialized && !router.currentRoute.value.path.startsWith('/auth')) {
        await router.push('/auth/login')
      }
    }
  })
  
  // Handle auth state changes
  nuxtApp.hook('app:error', (error) => {
    if (error.statusCode === 401) {
      // Unauthorized - redirect to login
      router.push('/auth/login')
    }
  })
})