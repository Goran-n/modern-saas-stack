import { ref, type Ref } from 'vue'

export interface AsyncOperationOptions {
  onError?: (error: Error) => void
  onSuccess?: () => void
}

export interface AsyncOperationReturn<T> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  execute: (...args: any[]) => Promise<T | null>
  reset: () => void
}

/**
 * Composable for handling async operations with loading and error states
 * 
 * @example
 * ```ts
 * const { data, loading, error, execute } = useAsyncOperation(
 *   async (id: string) => {
 *     return await api.fetchUser(id)
 *   }
 * )
 * 
 * // Execute the operation
 * await execute('user-123')
 * ```
 */
export function useAsyncOperation<T, Args extends any[] = any[]>(
  operation: (...args: Args) => Promise<T>,
  options?: AsyncOperationOptions
): AsyncOperationReturn<T> {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  const execute = async (...args: Args): Promise<T | null> => {
    loading.value = true
    error.value = null

    try {
      const result = await operation(...args)
      data.value = result
      options?.onSuccess?.()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      error.value = errorMessage
      options?.onError?.(err as Error)
      
      // Don't throw by default to allow graceful error handling
      return null
    } finally {
      loading.value = false
    }
  }

  const reset = () => {
    data.value = null
    loading.value = false
    error.value = null
  }

  return {
    data: data as Ref<T | null>,
    loading,
    error,
    execute,
    reset
  }
}

/**
 * Variant that throws errors for use in try-catch blocks
 */
export function useAsyncOperationWithThrow<T, Args extends any[] = any[]>(
  operation: (...args: Args) => Promise<T>,
  options?: AsyncOperationOptions
): AsyncOperationReturn<T> {
  const { data, loading, error, reset } = useAsyncOperation(operation, options)

  const execute = async (...args: Args): Promise<T | null> => {
    loading.value = true
    error.value = null

    try {
      const result = await operation(...args)
      data.value = result
      options?.onSuccess?.()
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      error.value = errorMessage
      options?.onError?.(err as Error)
      throw err
    } finally {
      loading.value = false
    }
  }

  return {
    data: data as Ref<T | null>,
    loading,
    error,
    execute,
    reset
  }
}