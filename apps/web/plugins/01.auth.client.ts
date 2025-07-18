export default defineNuxtPlugin(async () => {
  const user = useSupabaseUser()
  const tenantStore = useTenantStore()
  
  console.log('Auth plugin loaded, current user:', user.value?.email)
  
  // Watch for user changes
  watch(user, async (newUser) => {
    console.log('User changed:', newUser?.email)
    if (newUser) {
      // User logged in, fetch their tenants
      try {
        console.log('Fetching user tenants...')
        await tenantStore.fetchUserTenants()
        console.log('User tenants fetched, selected tenant:', tenantStore.selectedTenantId)
      } catch (error) {
        console.error('Failed to fetch user tenants on login:', error)
      }
    } else {
      // User logged out, clear tenant selection
      tenantStore.$reset()
    }
  }, { immediate: true })
})