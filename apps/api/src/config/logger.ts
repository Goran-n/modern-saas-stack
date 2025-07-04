import pino from 'pino'
import { getLogConfig, getAppConfig } from './config'

const logConfig = getLogConfig()
const appConfig = getAppConfig()

// Create Pino logger with environment-based configuration
const logger = pino({
  level: logConfig.level,
  // Add error serializer to properly handle Error objects
  serializers: {
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
  },
  ...(logConfig.isDevelopment && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'HH:MM:ss',
        ignore: 'pid,hostname,service,version,environment',
        // Ensure all object details are shown
        singleLine: false,
        hideObject: false,
        // Remove custom messageFormat as it can't be serialized for worker threads
        errorLikeObjectKeys: ['err', 'error'],
      },
    },
  }),
  ...(logConfig.isProduction && {
    formatters: {
      level: (label) => {
        return { level: label }
      },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      service: 'kibly-api',
      version: appConfig.version,
      environment: appConfig.environment,
    },
  }),
  // Remove base metadata in development for cleaner logs
  ...(logConfig.isDevelopment && { base: {} }),
})

// Create child logger for requests
export const requestLogger = logger.child({ component: 'request' })

// Create child logger for database operations
export const dbLogger = logger.child({ component: 'database' })

// Create child logger for tRPC operations
export const trpcLogger = logger.child({ component: 'trpc' })

export default logger