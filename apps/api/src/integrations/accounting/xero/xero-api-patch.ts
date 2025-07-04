/**
 * Patch for xero-node library's ApiError class to handle cases where axios response is undefined
 * This prevents errors when network issues or timeouts occur
 */

import { ApiError } from 'xero-node/dist/model/ApiError'

// Store the original constructor
const OriginalApiError = ApiError

// Override the ApiError constructor
const PatchedApiError = class extends OriginalApiError {
  constructor(axiosError: any) {
    // Create a safe error object with default values if response is missing
    const safeError = {
      ...axiosError,
      response: axiosError.response || {
        status: axiosError.code === 'ECONNABORTED' ? 408 : 500,
        data: {
          error: axiosError.message || 'Network error',
          code: axiosError.code || 'UNKNOWN_ERROR'
        },
        headers: {}
      },
      request: axiosError.request || {
        protocol: 'https:',
        host: 'api.xero.com',
        path: '/',
        method: 'GET',
        getHeaders: () => ({})
      }
    }
    
    // Call the original constructor with the safe error
    super(safeError)
  }
}

// Export function to apply the patch
export function applyXeroApiPatch() {
  // Replace the ApiError export in the module
  const apiErrorModule = require('xero-node/dist/model/ApiError')
  apiErrorModule.ApiError = PatchedApiError
  
  console.log('Xero API error handling patch applied')
}