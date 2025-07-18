import { getDatabaseConnection } from './singleton'
import * as schema from './schemas'
import { logger } from '@kibly/utils'

export type DrizzleClient = ReturnType<typeof createDrizzleClient>

/**
 * Creates a Drizzle client instance
 * @deprecated Use getDatabaseConnection from './singleton' for better connection pooling
 */
export function createDrizzleClient(connectionString: string) {
  logger.warn('createDrizzleClient is deprecated. Use getDatabaseConnection for better connection pooling.')
  return getDatabaseConnection(connectionString)
}

export { schema }