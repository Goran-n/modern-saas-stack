export default defineNuxtRouteMiddleware((to) => {
  const authStore = useAuthStore()
  
  // Skip auth check for auth routes
  if (to.path.startsWith('/auth')) {
    return
  }
  
  // Redirect to login if not authenticated
  if (!authStore.isAuthenticated) {
    return navigateTo('/auth/login')
  }
})