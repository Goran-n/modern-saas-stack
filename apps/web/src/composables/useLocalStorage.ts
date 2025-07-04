import { ref, watch, type Ref, type UnwrapRef } from 'vue'

export interface UseLocalStorageOptions {
  serializer?: {
    read: (value: string) => any
    write: (value: any) => string
  }
  onError?: (error: Error) => void
}

/**
 * Reactive localStorage binding with automatic serialization
 * 
 * @example
 * ```ts
 * // Simple usage
 * const theme = useLocalStorage('theme', 'light')
 * 
 * // With complex object
 * const settings = useLocalStorage('app-settings', {
 *   notifications: true,
 *   language: 'en'
 * })
 * ```
 */
export function useLocalStorage<T>(
  key: string,
  defaultValue: T,
  options?: UseLocalStorageOptions
): Ref<UnwrapRef<T>> {
  const serializer = options?.serializer || {
    read: (v: string) => {
      try {
        return JSON.parse(v)
      } catch {
        return v
      }
    },
    write: (v: any) => JSON.stringify(v)
  }

  // Initialize value from localStorage or default
  const storedValue = localStorage.getItem(key)
  let initialValue: T

  try {
    initialValue = storedValue !== null 
      ? serializer.read(storedValue) 
      : defaultValue
  } catch (error) {
    console.error(`Error reading localStorage key "${key}":`, error)
    options?.onError?.(error as Error)
    initialValue = defaultValue
  }

  const data = ref<T>(initialValue)

  // Watch for changes and update localStorage
  watch(data, (newValue) => {
    try {
      if (newValue === null || newValue === undefined) {
        localStorage.removeItem(key)
      } else {
        localStorage.setItem(key, serializer.write(newValue))
      }
    } catch (error) {
      console.error(`Error writing localStorage key "${key}":`, error)
      options?.onError?.(error as Error)
    }
  }, { deep: true })

  // Listen for changes from other tabs/windows
  window.addEventListener('storage', (e) => {
    if (e.key === key && e.newValue !== null) {
      try {
        data.value = serializer.read(e.newValue)
      } catch (error) {
        console.error(`Error syncing localStorage key "${key}":`, error)
        options?.onError?.(error as Error)
      }
    }
  })

  return data as Ref<UnwrapRef<T>>
}

/**
 * Clears a localStorage item and resets to default value
 */
export function clearLocalStorage(key: string): void {
  localStorage.removeItem(key)
}

/**
 * Checks if localStorage is available
 */
export function isLocalStorageAvailable(): boolean {
  try {
    const testKey = '__localStorage_test__'
    localStorage.setItem(testKey, 'test')
    localStorage.removeItem(testKey)
    return true
  } catch {
    return false
  }
}