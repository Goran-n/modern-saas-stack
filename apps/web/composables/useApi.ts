import type { FetchOptions } from 'ofetch'

export const useApi = () => {
  const config = useRuntimeConfig()
  const authStore = useAuthStore()
  
  const apiFetch = $fetch.create({
    baseURL: config.public.apiUrl,
    onRequest({ options }) {
      // Add auth token if available
      const token = authStore.user?.id // TODO: Get actual token
      if (token) {
        options.headers = new Headers({
          ...options.headers,
          'Authorization': `Bearer ${token}`
        })
      }
    },
    onResponseError({ response }) {
      if (response.status === 401) {
        // Handle unauthorized
        authStore.signOut()
        navigateTo('/auth/login')
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