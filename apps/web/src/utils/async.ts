import { ref, type Ref } from 'vue'

export interface AsyncState<T> {
  data: Ref<T | null>
  error: Ref<Error | null>
  isLoading: Ref<boolean>
  execute: (...args: any[]) => Promise<T>
  reset: () => void
}

export function useAsyncState<T>(
  asyncFn: (...args: any[]) => Promise<T>,
  initialData: T | null = null
): AsyncState<T> {
  const data = ref<T | null>(initialData) as Ref<T | null>
  const error = ref<Error | null>(null)
  const isLoading = ref(false)
  
  async function execute(...args: any[]): Promise<T> {
    isLoading.value = true
    error.value = null
    
    try {
      const result = await asyncFn(...args)
      data.value = result
      return result
    } catch (e) {
      error.value = e as Error
      throw e
    } finally {
      isLoading.value = false
    }
  }
  
  function reset() {
    data.value = initialData
    error.value = null
    isLoading.value = false
  }
  
  return {
    data,
    error,
    isLoading,
    execute,
    reset
  }
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function retry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number
    delay?: number
    onRetry?: (error: Error, attempt: number) => void
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, onRetry } = options
  
  return new Promise(async (resolve, reject) => {
    let lastError: Error
    
    for (let i = 0; i <= retries; i++) {
      try {
        const result = await fn()
        return resolve(result)
      } catch (error) {
        lastError = error as Error
        
        if (i < retries) {
          onRetry?.(lastError, i + 1)
          await sleep(delay * Math.pow(2, i)) // Exponential backoff
        }
      }
    }
    
    reject(lastError!)
  })
}

export function timeout<T>(
  promise: Promise<T>,
  ms: number,
  errorMessage = 'Operation timed out'
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(errorMessage))
    }, ms)
    
    promise
      .then(resolve)
      .catch(reject)
      .finally(() => clearTimeout(timer))
  })
}