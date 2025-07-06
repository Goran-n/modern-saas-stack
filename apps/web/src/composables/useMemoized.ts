import { ref, computed, watch, type Ref, type ComputedRef } from 'vue'

export function useMemoized<T, Args extends unknown[]>(
  fn: (...args: Args) => T,
  keyFn?: (...args: Args) => string
): (...args: Args) => T {
  const cache = new Map<string, T>()
  
  return (...args: Args): T => {
    const key = keyFn ? keyFn(...args) : JSON.stringify(args)
    
    if (cache.has(key)) {
      return cache.get(key)!
    }
    
    const result = fn(...args)
    cache.set(key, result)
    
    return result
  }
}

export function useMemoizedRef<T>(
  compute: () => T,
  deps: Ref<any>[]
): ComputedRef<T> {
  const memoizedValue = ref<T>()
  const isInitialized = ref(false)
  
  const updateValue = () => {
    memoizedValue.value = compute()
    isInitialized.value = true
  }
  
  // Watch dependencies
  watch(deps, updateValue, { immediate: true })
  
  return computed(() => {
    if (!isInitialized.value) {
      updateValue()
    }
    return memoizedValue.value as T
  })
}

export function useListMemoization<T extends { id: string | number }>(
  items: Ref<T[]>
) {
  const itemsMap = computed(() => {
    const map = new Map<string | number, T>()
    items.value.forEach(item => {
      map.set(item.id, item)
    })
    return map
  })
  
  const getItemById = (id: string | number): T | undefined => {
    return itemsMap.value.get(id)
  }
  
  const sortedItems = computed(() => {
    return [...items.value].sort((a, b) => {
      if (typeof a.id === 'string' && typeof b.id === 'string') {
        return a.id.localeCompare(b.id)
      }
      return Number(a.id) - Number(b.id)
    })
  })
  
  return {
    itemsMap,
    getItemById,
    sortedItems
  }
}