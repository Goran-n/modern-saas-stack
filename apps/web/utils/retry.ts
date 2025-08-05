export interface RetryOptions {
  maxAttempts?: number
  delay?: number
  backoff?: boolean
  shouldRetry?: (error: unknown, attempt: number) => boolean
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    delay = 1000,
    backoff = true,
    shouldRetry = () => true
  } = options
  
  let lastError: unknown
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error
      
      // Check if we should retry
      if (attempt === maxAttempts || !shouldRetry(error, attempt)) {
        throw error
      }
      
      // Calculate delay with exponential backoff
      const waitTime = backoff ? delay * Math.pow(2, attempt - 1) : delay
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  
  throw lastError
}