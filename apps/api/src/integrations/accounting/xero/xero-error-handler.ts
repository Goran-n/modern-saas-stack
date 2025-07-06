import logger from '../../../config/logger'

export interface XeroApiError {
  statusCode?: number
  message: string
  code?: string
  body?: any
  headers?: any
  request?: any
}

/**
 * Safely wraps Xero API calls to handle errors when response is undefined
 * This prevents the ApiError constructor from throwing when accessing response properties
 */
export async function safeXeroApiCall<T>(
  apiCall: () => Promise<T>,
  operation: string
): Promise<T> {
  try {
    return await apiCall()
  } catch (error: any) {
    // Log the full error for debugging
    logger.error(`Xero API call failed - ${operation}`, {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
      code: error?.code
    })
    
    // Check if this is the specific error we're trying to handle
    if (error?.message?.includes('Cannot read properties of undefined') || 
        error?.stack?.includes('ApiError')) {
      logger.warn(`Handling xero-node ApiError bug for ${operation}`)
      
      // Create a structured error that mimics what would have been returned
      const apiError: XeroApiError = {
        statusCode: error.code === 'ECONNABORTED' ? 408 : 500,
        message: 'Network error occurred during Xero API call - likely authentication issue',
        code: error.code || 'NETWORK_ERROR',
        body: {
          error: 'The Xero API request failed. This is often due to expired credentials or network issues.',
          code: error.code,
          operation
        }
      }
      
      throw apiError
    }
    
    // For other errors, try to parse them if they're JSON strings
    if (typeof error === 'string') {
      try {
        const parsed = JSON.parse(error)
        if (parsed.response) {
          throw {
            statusCode: parsed.response.statusCode,
            message: parsed.response.body?.message || 'Xero API error',
            body: parsed.response.body,
            headers: parsed.response.headers,
            request: parsed.response.request
          }
        }
      } catch {
        // If parsing fails, just throw the original error
      }
    }
    
    throw error
  }
}

/**
 * Extract error details from various error formats
 */
export function extractXeroError(error: any): { status: number; message: string; details?: any } {
  // Handle our structured API errors
  if (error.statusCode) {
    return {
      status: error.statusCode,
      message: error.message || 'Unknown error',
      details: error.body
    }
  }
  
  // Handle axios errors with response
  if (error?.response) {
    return {
      status: error.response.status || 500,
      message: error.response.data?.message || error.message || 'Unknown error',
      details: error.response.data
    }
  }
  
  // Handle network errors
  if (error?.code === 'ECONNABORTED' || error?.code === 'ETIMEDOUT') {
    return {
      status: 408,
      message: 'Request timeout - Xero API took too long to respond',
      details: { code: error.code }
    }
  }
  
  if (error?.code === 'ENOTFOUND' || error?.code === 'ECONNREFUSED') {
    return {
      status: 503,
      message: 'Cannot connect to Xero API - service unavailable',
      details: { code: error.code }
    }
  }
  
  // Default error
  return {
    status: 500,
    message: error?.message || 'Unknown error occurred',
    details: error
  }
}