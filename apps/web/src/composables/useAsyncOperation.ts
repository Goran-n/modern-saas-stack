import { ref, type Ref } from 'vue'
import { getErrorMessage } from '@/utils/error'

export interface AsyncOperationOptions {
  onError?: (error: Error) => void
  onSuccess?: () => void
}

export interface AsyncOperationReturn<T, Args extends unknown[]> {
  data: Ref<T | null>
  loading: Ref<boolean>
  error: Ref<string | null>
  execute: (...args: Args) => Promise<T | null>
  reset: () => void
}

export function useAsyncOperation<T, Args extends unknown[] = []>(
  operation: (...args: Args) => Promise<T>,
  options?: AsyncOperationOptions
): AsyncOperationReturn<T, Args> {
  const data = ref<T | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function execute(...args: Args): Promise<T | null> {
    loading.value = true
    error.value = null

    try {
      const result = await operation(...args)
      data.value = result
      options?.onSuccess?.()
      return result
    } catch (err) {
      error.value = getErrorMessage(err)
      options?.onError?.(err as Error)
      
      // Don't throw by default to allow graceful error handling
      return null
    } finally {
      loading.value = false
    }
  }

  function reset(): void {
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

export function useAsyncOperationWithThrow<T, Args extends unknown[] = []>(
  operation: (...args: Args) => Promise<T>,
  options?: AsyncOperationOptions
): AsyncOperationReturn<T, Args> {
  const { data, loading, error, reset } = useAsyncOperation(operation, options)

  async function execute(...args: Args): Promise<T | null> {
    loading.value = true
    error.value = null

    try {
      const result = await operation(...args)
      data.value = result
      options?.onSuccess?.()
      return result
    } catch (err) {
      error.value = getErrorMessage(err)
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