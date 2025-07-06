/**
 * Transform layer for tRPC to handle common data transformations
 * This ensures consistent data types between backend and frontend
 */

/**
 * Recursively convert date strings to Date objects
 */
export function convertDatesToObjects(obj: any): any {
  if (obj === null || obj === undefined) return obj
  
  // Handle Date strings (ISO 8601 format)
  if (typeof obj === 'string') {
    // Check if it's a valid ISO date string
    const dateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/
    if (dateRegex.test(obj)) {
      const date = new Date(obj)
      // Verify it's a valid date
      if (!isNaN(date.getTime())) {
        return date
      }
    }
    return obj
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(convertDatesToObjects)
  }
  
  // Handle objects
  if (typeof obj === 'object') {
    const converted: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        converted[key] = convertDatesToObjects(obj[key])
      }
    }
    return converted
  }
  
  return obj
}

/**
 * Unwrap entities that have a .props wrapper from the backend
 */
export function unwrapEntityProps(obj: any): any {
  if (obj === null || obj === undefined) return obj
  
  // If object has props and props is an object, unwrap it
  if (typeof obj === 'object' && obj.props && typeof obj.props === 'object') {
    // Preserve the id if it exists at the top level
    const unwrapped = { ...obj.props }
    if (obj.id && !unwrapped.id) {
      unwrapped.id = obj.id
    }
    return unwrapEntityProps(unwrapped)
  }
  
  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(unwrapEntityProps)
  }
  
  // Handle nested objects
  if (typeof obj === 'object') {
    const unwrapped: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        unwrapped[key] = unwrapEntityProps(obj[key])
      }
    }
    return unwrapped
  }
  
  return obj
}

/**
 * Transform specific date fields that we know should be dates
 */
const dateFields = [
  'createdAt',
  'updatedAt',
  'deletedAt',
  'lastSyncAt',
  'lastActivityAt',
  'joinedAt',
  'lastAccessAt',
  'connectedAt',
  'expiresAt',
  'timestamp',
  'date',
  'startDate',
  'endDate',
  'dueDate',
  'invoiceDate',
  'paymentDate'
]

export function transformKnownDateFields(obj: any): any {
  if (obj === null || obj === undefined) return obj
  
  if (Array.isArray(obj)) {
    return obj.map(transformKnownDateFields)
  }
  
  if (typeof obj === 'object') {
    const transformed: any = {}
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const value = obj[key]
        
        // Check if this is a known date field and the value is a string
        if (dateFields.includes(key) && typeof value === 'string') {
          const date = new Date(value)
          transformed[key] = !isNaN(date.getTime()) ? date : value
        } else {
          transformed[key] = transformKnownDateFields(value)
        }
      }
    }
    return transformed
  }
  
  return obj
}

/**
 * Transform a single value (applies all transformations)
 */
export function transformValue(value: any): any {
  let transformed = value
  transformed = unwrapEntityProps(transformed)
  transformed = convertDatesToObjects(transformed)
  transformed = transformKnownDateFields(transformed)
  return transformed
}

/**
 * Create a transformed tRPC proxy that wraps all procedures
 */
export function createTransformedTRPC<T extends Record<string, any>>(trpcClient: T): T {
  const handler: ProxyHandler<any> = {
    get(target, prop) {
      const value = target[prop]
      
      // If it's a function (query/mutation), wrap it
      if (typeof value === 'function') {
        return new Proxy(value, {
          apply: async (target, thisArg, argumentsList) => {
            const result = await Reflect.apply(target, thisArg, argumentsList)
            return transformValue(result)
          }
        })
      }
      
      // If it's an object (nested router), recursively proxy it
      if (value && typeof value === 'object') {
        return createTransformedTRPC(value)
      }
      
      return value
    }
  }
  
  return new Proxy(trpcClient, handler)
}

/**
 * Enhanced safe query wrapper with transformations
 */
export async function transformedQuery<T>(
  queryFn: () => Promise<any>
): Promise<T> {
  const result = await queryFn()
  return transformValue(result) as T
}

/**
 * Enhanced safe mutation wrapper with transformations
 */
export async function transformedMutation<T>(
  mutationFn: () => Promise<any>
): Promise<T> {
  const result = await mutationFn()
  return transformValue(result) as T
}