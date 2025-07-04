import { ref } from 'vue'
import { useRouter } from 'vue-router'

export interface ErrorHandlerOptions {
  showNotification?: boolean
  logToConsole?: boolean
  redirectOn401?: boolean
}

interface ErrorContext {
  operation?: string
  context?: Record<string, any>
}

/**
 * Centralized error handling composable
 * 
 * @example
 * ```ts
 * const { handleError, clearError, lastError } = useErrorHandler()
 * 
 * try {
 *   await someOperation()
 * } catch (error) {
 *   handleError(error, 'Failed to perform operation', {
 *     context: { userId: user.id }
 *   })
 * }
 * ```
 */
export function useErrorHandler(options: ErrorHandlerOptions = {}) {
  const router = useRouter()
  const lastError = ref<Error | null>(null)
  const errorMessage = ref<string | null>(null)

  const {
    showNotification = true,
    logToConsole = true,
    redirectOn401 = true
  } = options

  const handleError = (
    error: unknown,
    fallbackMessage = 'An unexpected error occurred',
    context?: ErrorContext
  ): string => {
    // Store the error
    lastError.value = error instanceof Error ? error : new Error(String(error))

    // Extract error message
    let message = fallbackMessage
    
    if (error instanceof Error) {
      message = error.message
      
      // Handle specific error types
      if ('statusCode' in error) {
        const statusCode = (error as any).statusCode
        
        if (statusCode === 401 && redirectOn401) {
          // Unauthorized - redirect to login
          router.push({
            path: '/auth/login',
            query: { redirect: router.currentRoute.value.fullPath }
          })
          message = 'Your session has expired. Please log in again.'
        } else if (statusCode === 403) {
          message = 'You do not have permission to perform this action.'
        } else if (statusCode === 404) {
          message = 'The requested resource was not found.'
        } else if (statusCode >= 500) {
          message = 'A server error occurred. Please try again later.'
        }
      }
    }

    // Handle validation errors
    if (error && typeof error === 'object' && 'errors' in error) {
      const validationErrors = (error as any).errors
      if (Array.isArray(validationErrors)) {
        message = validationErrors.map(e => e.message || e).join(', ')
      }
    }

    errorMessage.value = message

    // Log to console if enabled
    if (logToConsole) {
      console.error(context?.operation || 'Error occurred:', {
        error,
        message,
        context: context?.context
      })
    }

    // Show notification if enabled (you would integrate with your notification system)
    if (showNotification) {
      // This is where you'd trigger a toast/notification
      // For now, we'll just log it
      console.warn('Error notification:', message)
    }

    return message
  }

  const clearError = () => {
    lastError.value = null
    errorMessage.value = null
  }

  const isNetworkError = (error: unknown): boolean => {
    if (error instanceof Error) {
      return error.message.toLowerCase().includes('network') ||
             error.message.toLowerCase().includes('fetch') ||
             error.name === 'NetworkError'
    }
    return false
  }

  const isValidationError = (error: unknown): boolean => {
    return error !== null && 
           typeof error === 'object' && 
           ('errors' in error || 'validationErrors' in error)
  }

  const getErrorCode = (error: unknown): string | null => {
    if (error && typeof error === 'object' && 'code' in error) {
      return String((error as any).code)
    }
    return null
  }

  return {
    handleError,
    clearError,
    lastError,
    errorMessage,
    isNetworkError,
    isValidationError,
    getErrorCode
  }
}