import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import { getDatabaseConfig } from '../config/config'
import { dbLogger } from '../config/logger'
import { schema } from './schema'

const dbConfig = getDatabaseConfig()

let db: ReturnType<typeof drizzle> | null = null
let client: postgres.Sql | null = null
let isConnected = false


/**
 * Connect to database
 */
export async function connectDatabase(): Promise<void> {
  if (!dbConfig.url) {
    throw new Error('DATABASE_URL is required')
  }

  if (db && isConnected) {
    return
  }

  try {
    client = postgres(dbConfig.url)
    db = drizzle(client, { schema })
    
    // Test the connection
    await db.execute('SELECT 1')
    isConnected = true
  } catch (error) {
    if (client) {
      try {
        await client.end()
      } catch {
        // Ignore error when closing failed connection
      }
      client = null
    }
    db = null
    isConnected = false
    throw error
  }
}

/**
 * Get the database instance
 * Throws an error if database is not connected (fail-fast approach)
 */
export function getDatabase() {
  if (!db || !isConnected) {
    throw new Error('Database not connected. Ensure connectDatabase() was called during bootstrap.')
  }
  return db
}

/**
 * Check database health and connectivity
 */
export async function checkDatabaseHealth(): Promise<{ status: string; connected: boolean; details?: any }> {
  if (!db || !isConnected) {
    return { 
      status: 'not connected', 
      connected: false,
      details: { message: 'Database connection not established' }
    }
  }

  try {
    const start = Date.now()
    
    // Test basic connectivity
    await db.execute('SELECT 1 as test')
    
    // Test database-specific query
    const result = await db.execute('SELECT version() as version')
    
    const duration = Date.now() - start
    
    return { 
      status: 'connected', 
      connected: true,
      details: {
        responseTime: `${duration}ms`,
        version: result[0]?.version || 'unknown',
        timestamp: new Date().toISOString()
      }
    }
  } catch (error) {
    dbLogger.error({
      event: 'health_check_failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    }, 'Database health check failed')
    isConnected = false // Mark as disconnected on health check failure
    
    return { 
      status: 'connection failed', 
      connected: false,
      details: {
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }
    }
  }
}

/**
 * Close database connection gracefully
 */
export async function closeDatabase(): Promise<void> {
  if (client) {
    try {
      dbLogger.info('🔄 Closing database connection...')
      await client.end()
      dbLogger.info('✅ Database connection closed')
    } catch (error) {
      dbLogger.error({
        event: 'close_failed',
        error: error instanceof Error ? error.message : 'Unknown error',
      }, '❌ Error closing database connection')
      throw error
    } finally {
      client = null
      db = null
      isConnected = false
    }
  }
}

/**
 * Get connection status
 */
export function isConnectedToDatabase(): boolean {
  return isConnected && db !== null
}