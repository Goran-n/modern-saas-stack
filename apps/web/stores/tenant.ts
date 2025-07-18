export const useTenantStore = defineStore('tenant', () => {
  const api = useApi()
  
  // State
  const userTenants = ref<any[]>([])
  const selectedTenantId = ref<string | null>(null)
  const isLoading = ref(false)
  
  // Getters
  const selectedTenant = computed(() => 
    userTenants.value.find(ut => ut.tenant.id === selectedTenantId.value)?.tenant
  )
  
  // Actions
  async function fetchUserTenants() {
    try {
      isLoading.value = true
      const response = await api.get<any>('/trpc/auth.getUserTenants')
      userTenants.value = response.result.data.json
      
      // Auto-select tenant if needed
      loadSelectedTenant()
      
      // If no tenant selected yet, auto-select:
      // - The only tenant if user has one tenant
      // - The tenant with the most recent access if user has multiple tenants
      if (!selectedTenantId.value && userTenants.value.length > 0) {
        // Sort by lastAccessAt to get the most recently accessed tenant
        const sortedTenants = [...userTenants.value].sort((a, b) => {
          const dateA = new Date(a.lastAccessAt).getTime()
          const dateB = new Date(b.lastAccessAt).getTime()
          return dateB - dateA // Most recent first
        })
        selectTenant(sortedTenants[0].tenant.id)
      }
    } catch (error: any) {
      console.error('Failed to fetch user tenants:', error)
      // Don't throw on error - this allows the app to continue working
      // even if tenant fetching fails temporarily
      if (error?.data?.code === 'UNAUTHORIZED') {
        // User is not authenticated, this is expected
        return
      }
    } finally {
      isLoading.value = false
    }
  }
  
  function selectTenant(tenantId: string) {
    selectedTenantId.value = tenantId
    // Persist to localStorage
    localStorage.setItem('selectedTenantId', tenantId)
  }
  
  function loadSelectedTenant() {
    const stored = localStorage.getItem('selectedTenantId')
    if (stored && userTenants.value.some(ut => ut.tenant.id === stored)) {
      selectedTenantId.value = stored
    }
  }
  
  function $reset() {
    userTenants.value = []
    selectedTenantId.value = null
    isLoading.value = false
    localStorage.removeItem('selectedTenantId')
  }
  
  return {
    userTenants: readonly(userTenants),
    selectedTenantId,
    selectedTenant,
    isLoading: readonly(isLoading),
    fetchUserTenants,
    selectTenant,
    loadSelectedTenant,
    $reset
  }
})