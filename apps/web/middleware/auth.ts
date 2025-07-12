export default defineNuxtRouteMiddleware((to) => {
  const user = useSupabaseUser()
  
  // Skip auth check for auth routes
  if (to.path.startsWith('/auth')) {
    return
  }
  
  // Check authentication status
  if (!user.value) {
    return navigateTo('/auth/login')
  }
})