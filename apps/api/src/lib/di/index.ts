import { DIContainer } from './container'
import { getDatabase } from '../../database/connection'
import { getRedisClient } from '@kibly/shared-utils'
import { XeroClient } from 'xero-node'
import log from '../../config/logger'

// Import repositories
import { DrizzleTenantRepository } from '../../infrastructure/repositories/drizzle-tenant.repository'
import { DrizzleUserRepository } from '../../infrastructure/repositories/drizzle-user.repository'
import { DrizzleIntegrationRepository } from '../../infrastructure/repositories/drizzle-integration.repository'
import { DrizzleSyncJobRepository } from '../../infrastructure/repositories/drizzle-sync-job.repository'
import { DrizzleTransactionRepository } from '../../infrastructure/repositories/drizzle-transaction.repository'
import { DrizzleTenantMemberRepository } from '../../infrastructure/repositories/drizzle-tenant-member.repository'

// Create the global container instance
export const container = new DIContainer({
  enableLogging: process.env.NODE_ENV === 'development'
})

// Register core infrastructure services
export function registerCoreServices(): void {
  console.log('registerCoreServices: Starting core service registration...')
  // Database
  container.register('Database', {
    useFactory: () => getDatabase()
  }, 'singleton')

  // Redis
  container.register('Redis', {
    useFactory: async () => {
      const redis = await getRedisClient()
      if (!redis) {
        throw new Error('Redis connection not available')
      }
      return redis
    }
  }, 'singleton')

  // Logger
  container.register('Logger', {
    useValue: log
  }, 'singleton')

  // Xero Client Factory
  container.register('XeroClientFactory', {
    useFactory: () => {
      return (tenantId?: string) => {
        const redirectUri = tenantId 
          ? `${process.env.XERO_REDIRECT_URI}?tenantId=${tenantId}`
          : process.env.XERO_REDIRECT_URI

        return new XeroClient({
          clientId: process.env.XERO_CLIENT_ID!,
          clientSecret: process.env.XERO_CLIENT_SECRET!,
          redirectUris: [redirectUri!],
          scopes: (process.env.XERO_SCOPES || '').split(' ')
        })
      }
    }
  }, 'singleton')

  // Register repositories - MUST happen before services are imported
  container.register('TenantRepository', {
    useClass: DrizzleTenantRepository,
    dependencies: ['Database'],
  }, 'singleton')

  container.register('UserRepository', {
    useClass: DrizzleUserRepository,
    dependencies: ['Database'],
  }, 'singleton')

  container.register('IntegrationRepository', {
    useClass: DrizzleIntegrationRepository,
    dependencies: ['Database'],
  }, 'singleton')

  container.register('SyncJobRepository', {
    useClass: DrizzleSyncJobRepository,
    dependencies: ['Database'],
  }, 'singleton')

  container.register('TransactionRepository', {
    useClass: DrizzleTransactionRepository,
    dependencies: ['Database'],
  }, 'singleton')

  container.register('TenantMemberRepository', {
    useClass: DrizzleTenantMemberRepository,
    dependencies: ['Database'],
  }, 'singleton')
  
  console.log('registerCoreServices: All core services and repositories registered')
}

// Export types
export * from './types'
export * from './decorators'