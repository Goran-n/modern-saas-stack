import { createTRPCClient, httpBatchLink, TRPCClientError } from '@trpc/client'
import type { AppRouter } from '@kibly/api'
import { supabase } from './supabase'
import { createTransformedTRPC, transformValue } from './trpc-transforms'

// Get base API URL from environment
const apiBaseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'

// Global state for reactive headers
let currentTenantId: string | null = null
let currentAuthToken: string | null = null
let currentUserId: string | null = null

/**
 * Handle authentication failures by logging out the user
 */
const handleAuthenticationFailure = async () => {
  try {
    console.warn('Clearing authentication state due to unauthorized error')
    
    // Clear tRPC context first
    resetTRPCContext()
    
    // Sign out from Supabase
    await supabase.auth.signOut()
    
    // Redirect to login page
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  } catch (error) {
    console.error('Error during automatic logout:', error)
    // Force redirect even if logout fails
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  }
}

/**
 * Update the tenant context for all future tRPC requests
 * This should be called by the app store when workspace changes
 */
export const updateTRPCTenantContext = (tenantId: string | null) => {
  const changed = currentTenantId !== tenantId
  console.debug('Updating tRPC tenant context', { 
    tenantId, 
    previousTenantId: currentTenantId,
    changed,
    timestamp: new Date().toISOString()
  })
  currentTenantId = tenantId
}

/**
 * Update the auth context for all future tRPC requests
 * This should be called by the auth store when auth state changes
 */
export const updateTRPCAuthContext = (token: string | null, userId: string | null) => {
  console.debug('Updating tRPC auth context', { hasToken: !!token, userId })
  currentAuthToken = token
  currentUserId = userId
}

/**
 * Reset all tRPC context (for logout)
 */
export const resetTRPCContext = () => {
  console.debug('Resetting tRPC context')
  currentTenantId = null
  currentAuthToken = null
  currentUserId = null
}

/**
 * Base tRPC client with reactive state and better error handling
 */
const baseTrpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${apiBaseUrl}/trpc`,
      headers: async () => {
        console.debug('tRPC headers function called', { 
          currentTenantId, 
          timestamp: new Date().toISOString() 
        })
        
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        }

        // Get fresh auth token and validate expiry
        let authToken = currentAuthToken
        let userId = currentUserId
        
        try {
          const { data: { session } } = await supabase.auth.getSession()
          if (session?.access_token) {
            // Check if token is close to expiry (refresh if < 5 minutes remaining)
            const now = Math.floor(Date.now() / 1000)
            const tokenExp = session.expires_at || 0
            const timeUntilExpiry = tokenExp - now
            
            if (timeUntilExpiry < 300) { // Less than 5 minutes
              console.debug('Token expiring soon, refreshing session')
              const { data: { session: refreshedSession } } = await supabase.auth.refreshSession()
              if (refreshedSession?.access_token) {
                authToken = refreshedSession.access_token
                userId = refreshedSession.user?.id || null
              } else {
                console.warn('Failed to refresh session')
                authToken = null
                userId = null
              }
            } else {
              authToken = session.access_token
              userId = session.user?.id || null
            }
            
            // Update cache
            updateTRPCAuthContext(authToken, userId)
          } else {
            authToken = null
            userId = null
          }
        } catch (error) {
          console.error('Failed to get Supabase session for tRPC:', error)
          authToken = null
          userId = null
        }

        // Add authentication header
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`
        }

        // Add tenant context header
        if (currentTenantId) {
          headers['x-tenant-id'] = currentTenantId
        }

        // Add user ID for backend context
        if (userId) {
          headers['x-user-id'] = userId
        }

        // Debug logging for development
        if (import.meta.env.DEV) {
          console.debug('tRPC headers', {
            hasAuth: !!authToken,
            tenantId: currentTenantId,
            userId,
            url: `${apiBaseUrl}/trpc`,
            tokenLength: authToken?.length || 0,
            tokenPrefix: authToken?.substring(0, 20) + '...'
          })
        }

        return headers
      },
      
      // Enhanced error handling
      fetch: async (url, options) => {
        try {
          const response = await fetch(url, options)
          
          // Log failed requests in development
          if (!response.ok && import.meta.env.DEV) {
            console.warn('tRPC request failed', {
              url,
              status: response.status,
              statusText: response.statusText,
              tenantId: currentTenantId,
              hasAuth: !!currentAuthToken
            })
          }
          
          return response
        } catch (error) {
          console.error('tRPC network error', { url, error })
          throw error
        }
      }
    }),
  ],
})

/**
 * Enhanced tRPC client with automatic transformations
 */
export const trpc = createTransformedTRPC(baseTrpc)

/**
 * Enhanced tRPC error handler that provides better error context
 */
export const handleTRPCError = (error: unknown, context?: string): never => {
  if (error instanceof TRPCClientError) {
    const { message, data, shape } = error
    
    // Check for common tenant context errors
    if (message.includes('Tenant context required') || data?.code === 'BAD_REQUEST') {
      console.error('tRPC Tenant Context Error', {
        message,
        context,
        currentTenantId,
        hasAuth: !!currentAuthToken,
        errorData: data
      })
      
      throw new Error(`Workspace context required. Please ensure you have selected a workspace. ${context ? `(${context})` : ''}`)
    }
    
    // Check for auth errors
    if (data?.code === 'UNAUTHORIZED') {
      console.error('tRPC Auth Error', {
        message,
        context,
        hasAuth: !!currentAuthToken
      })
      
      // Automatically log out the user when we receive UNAUTHORIZED
      console.warn('Authentication failed - triggering automatic logout')
      handleAuthenticationFailure()
      
      throw new Error(`Authentication required. Please log in again. ${context ? `(${context})` : ''}`)
    }
    
    // Generic tRPC error
    console.error('tRPC Error', {
      message,
      context,
      code: data?.code,
      errorData: data
    })
    
    throw new Error(message || 'An API error occurred')
  }
  
  // Non-tRPC error
  console.error('Non-tRPC Error', { error, context })
  throw error instanceof Error ? error : new Error('An unexpected error occurred')
}

/**
 * Wrapper for tRPC queries with enhanced error handling
 * Note: Transformations are automatically applied by the proxy
 */
export const safeTRPCQuery = async <T>(
  queryFn: () => Promise<T>,
  context?: string
): Promise<T> => {
  try {
    const result = await queryFn()
    
    // Handle potential batched response
    // This shouldn't be necessary with proper tRPC setup, but adding as safety
    if (Array.isArray(result) && (result as any).length === 1 && (result as any)[0]?.result?.data !== undefined) {
      console.warn('Detected raw batched response in safeTRPCQuery - this suggests tRPC client issue')
      return (result as any)[0].result.data as T
    }
    
    // Proxy handles transformations automatically
    return result
  } catch (error) {
    return handleTRPCError(error, context)
  }
}

/**
 * Wrapper for tRPC mutations with enhanced error handling
 */
export const safeTRPCMutation = async <T>(
  mutationFn: () => Promise<T>,
  context?: string
): Promise<T> => {
  try {
    return await mutationFn()
  } catch (error) {
    return handleTRPCError(error, context)
  }
}