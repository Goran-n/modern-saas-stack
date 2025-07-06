export * from './container'
export * from './verification'

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export function isUuid(value: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  return uuidRegex.test(value)
}

export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export function validatePhone(phone: string): boolean {
  const phoneRegex = /^\+?[1-9]\d{1,14}$/
  return phoneRegex.test(phone.replace(/\s+/g, ''))
}

export function sanitizeString(input: string): string {
  return input
    .trim()
    .replace(/[<>]/g, '')
    .replace(/\s+/g, ' ')
}

export function generateId(): string {
  return crypto.randomUUID()
}

export function pick<T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> {
  const result = {} as Pick<T, K>
  for (const key of keys) {
    if (key in obj) {
      result[key] = obj[key]
    }
  }
  return result
}

export function omit<T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> {
  const result = { ...obj }
  for (const key of keys) {
    delete result[key]
  }
  return result
}

export function isEmptyObject(obj: Record<string, unknown>): boolean {
  return Object.keys(obj).length === 0
}

export function deepClone<T extends object>(obj: T): T {
  return JSON.parse(JSON.stringify(obj))
}

export function asyncRetry<T>(
  fn: () => Promise<T>,
  options: {
    retries?: number
    delay?: number
    backoffMultiplier?: number
  } = {}
): Promise<T> {
  const { retries = 3, delay = 1000, backoffMultiplier = 2 } = options

  return new Promise((resolve, reject) => {
    let attempt = 0

    const execute = async () => {
      try {
        const result = await fn()
        resolve(result)
      } catch (error) {
        attempt++
        if (attempt >= retries) {
          reject(error)
          return
        }

        const waitTime = delay * Math.pow(backoffMultiplier, attempt - 1)
        setTimeout(execute, waitTime)
      }
    }

    execute()
  })
}