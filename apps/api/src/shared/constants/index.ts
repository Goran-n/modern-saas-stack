export const PAGINATION = {
  DEFAULT_LIMIT: 20,
  MAX_LIMIT: 100,
  DEFAULT_OFFSET: 0,
} as const

export const CACHE = {
  DEFAULT_TTL: 300, // 5 minutes
  SHORT_TTL: 60,    // 1 minute
  LONG_TTL: 3600,   // 1 hour
} as const

export const RATE_LIMITS = {
  DEFAULT: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100,
  },
  AUTH: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5,
  },
  API: {
    windowMs: 60 * 1000, // 1 minute
    max: 60,
  },
} as const

export const TENANT = {
  MAX_MEMBERS: 50,
  SLUG_MIN_LENGTH: 3,
  SLUG_MAX_LENGTH: 50,
  NAME_MAX_LENGTH: 100,
} as const

export const INVITATION = {
  DEFAULT_EXPIRY_HOURS: 72,
  MAX_EXPIRY_HOURS: 168, // 1 week
  MIN_EXPIRY_HOURS: 1,
} as const

export const INTEGRATION = {
  MAX_PER_TENANT: 10,
  SYNC_TIMEOUT_MS: 30000,
  MAX_RETRY_ATTEMPTS: 3,
  BACKOFF_MULTIPLIER: 2,
} as const

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const