import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import * as schema from './schemas'

export type DrizzleClient = ReturnType<typeof createDrizzleClient>

export function createDrizzleClient(connectionString: string) {
  const queryClient = postgres(connectionString)
  return drizzle(queryClient, { schema })
}

export { schema }