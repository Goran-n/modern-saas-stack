import type { FetchOptions } from 'ofetch'

export const useApi = () => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  const tenantStore = useTenantStore()
  const { auth } = useNotifications()
  
  const apiFetch = $fetch.create({
    baseURL: config.public.apiUrl,
    async onRequest({ options }) {
      // Get actual JWT token from Supabase session
      const supabaseClient = useSupabaseClient()
      const { data: { session } } = await supabaseClient.auth.getSession()
      const token = session?.access_token
      
      if (token) {
        const headers: any = {
          ...options.headers,
          'Authorization': `Bearer ${token}`
        }
        
        // Add tenant ID if selected
        if (tenantStore.selectedTenantId) {
          headers['x-tenant-id'] = tenantStore.selectedTenantId
        }
        
        options.headers = new Headers(headers)
      }
    },
    async onResponseError({ response }) {
      if (response.status === 401) {
        // Token expired or invalid - sign out user
        try {
          await authStore.signOut()
          auth.signOutSuccess()
        } catch (error) {
          console.error('Error during automatic logout:', error)
        }
        await navigateTo('/auth/login')
      }
    }
  })

  return {
    get: <T>(url: string, options?: FetchOptions) => 
      apiFetch<T>(url, { ...options, method: 'GET' }),
    
    post: <T>(url: string, body?: any, options?: FetchOptions) => 
      apiFetch<T>(url, { ...options, method: 'POST', body }),
    
    put: <T>(url: string, body?: any, options?: FetchOptions) => 
      apiFetch<T>(url, { ...options, method: 'PUT', body }),
    
    patch: <T>(url: string, body?: any, options?: FetchOptions) => 
      apiFetch<T>(url, { ...options, method: 'PATCH', body }),
    
    delete: <T>(url: string, options?: FetchOptions) => 
      apiFetch<T>(url, { ...options, method: 'DELETE' })
  }
}