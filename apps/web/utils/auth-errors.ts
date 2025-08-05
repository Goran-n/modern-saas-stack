export interface AuthErrorInfo {
  code: string
  message: string
  userMessage: string
  isRetryable: boolean
}

// Map of Supabase auth error codes to user-friendly messages
const authErrorMap: Record<string, Partial<AuthErrorInfo>> = {
  'invalid_credentials': {
    userMessage: 'Invalid email or password. Please check your credentials and try again.',
    isRetryable: false
  },
  'email_not_confirmed': {
    userMessage: 'Please verify your email address before signing in.',
    isRetryable: false
  },
  'user_not_found': {
    userMessage: 'No account found with this email address.',
    isRetryable: false
  },
  'weak_password': {
    userMessage: 'Password must be at least 6 characters long.',
    isRetryable: false
  },
  'email_taken': {
    userMessage: 'An account with this email already exists.',
    isRetryable: false
  },
  'invalid_jwt': {
    userMessage: 'Your session has expired. Please sign in again.',
    isRetryable: false
  },
  'session_not_found': {
    userMessage: 'No active session found. Please sign in.',
    isRetryable: false
  },
  'refresh_token_not_found': {
    userMessage: 'Unable to refresh your session. Please sign in again.',
    isRetryable: true
  },
  'network_failure': {
    userMessage: 'Network error. Please check your connection and try again.',
    isRetryable: true
  },
  'rate_limit': {
    userMessage: 'Too many attempts. Please wait a moment and try again.',
    isRetryable: true
  }
}

export function parseAuthError(error: unknown): AuthErrorInfo {
  // Default error info
  const defaultError: AuthErrorInfo = {
    code: 'unknown_error',
    message: 'An unexpected error occurred',
    userMessage: 'Something went wrong. Please try again.',
    isRetryable: true
  }
  
  if (!error) {
    return defaultError
  }
  
  // Handle Supabase AuthError
  if (error && typeof error === 'object' && '__isAuthError' in error) {
    const authError = error as any
    const errorInfo = authErrorMap[authError.code || ''] || {}
    
    return {
      code: authError.code || 'auth_error',
      message: authError.message || 'Authentication error',
      userMessage: errorInfo.userMessage || authError.message || 'Authentication failed',
      isRetryable: errorInfo.isRetryable ?? false
    }
  }
  
  // Handle generic Error
  if (error instanceof Error) {
    // Check for network errors
    if (error.message.includes('fetch') || error.message.includes('network')) {
      return {
        code: 'network_failure',
        message: error.message,
        userMessage: authErrorMap.network_failure!.userMessage!,
        isRetryable: true
      }
    }
    
    return {
      ...defaultError,
      message: error.message
    }
  }
  
  // Handle string errors
  if (typeof error === 'string') {
    return {
      ...defaultError,
      message: error
    }
  }
  
  return defaultError
}

export function isRetryableError(error: unknown): boolean {
  const errorInfo = parseAuthError(error)
  return errorInfo.isRetryable
}

export function getErrorMessage(error: unknown): string {
  const errorInfo = parseAuthError(error)
  return errorInfo.userMessage
}