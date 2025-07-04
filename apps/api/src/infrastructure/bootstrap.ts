import { container, TOKENS } from '../shared/utils/container'
import { getDatabase } from '../database/connection'
import {
  DrizzleTransactionRepository,
  DrizzleIntegrationRepository,
  DrizzleSyncJobRepository,
  DrizzleTenantMemberRepository,
  DrizzleFileRepository,
} from './repositories/index'
import { TriggerSyncUseCase } from '../core/usecases/sync/trigger-sync.usecase'
import { ImportTransactionsUseCase } from '../core/usecases/sync/import-transactions.usecase'
import { TokenManagementService } from '../core/services/token-management.service'
import { EntityLookupService } from '../core/services/entity-lookup.service'
import { ErrorHandler } from '../core/errors/error-handler'
import { XeroProvider } from '../integrations/accounting/xero/xero.provider'
import { getXeroConfig } from '../config/config'
import type { TransactionRepository } from '../core/ports/transaction.repository'
import type { IntegrationRepository } from '../core/ports/integration.repository'
import type { SyncJobRepository } from '../core/ports/sync-job.repository'
import type { TenantMemberRepository } from '../core/ports/tenant-member.repository'
import type { FileRepository } from '../core/ports/file.repository'
import type { FileStorage } from '../core/ports/storage/file-storage'
import { StorageFactory } from './storage/storage-factory'
import type { S3Config } from './storage/s3-file-storage'
import { FileService } from '../services/file.service'
import log from '../config/logger'

export function bootstrapDependencies(): void {
  try {
    // 1. Register infrastructure
    registerDatabase()
    
    // 2. Register repositories
    registerRepositories()
    
    // 3. Register providers
    registerProviders()
    
    // 4. Register core services
    registerCoreServices()
    
    // 5. Register use cases
    registerUseCases()
    
    log.info('Dependency injection container bootstrapped successfully')
  } catch (error) {
    log.error('Failed to bootstrap dependencies:', error)
    throw error
  }
}

function registerDatabase(): void {
  container.registerInstance(TOKENS.DATABASE, getDatabase())
}

function registerRepositories(): void {
  // Transaction Repository
  container.register(TOKENS.TRANSACTION_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleTransactionRepository(db) as TransactionRepository
  })

  // Integration Repository
  container.register(TOKENS.INTEGRATION_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleIntegrationRepository(db) as IntegrationRepository
  })

  // Sync Job Repository
  container.register(TOKENS.SYNC_JOB_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleSyncJobRepository(db) as SyncJobRepository
  })

  // Tenant Member Repository
  container.register(TOKENS.TENANT_MEMBER_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleTenantMemberRepository(db) as TenantMemberRepository
  })

  // File Repository
  container.register(TOKENS.FILE_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleFileRepository(db)
  })
}

function registerProviders(): void {
  // Xero Stateless Provider
  container.register(TOKENS.XERO_PROVIDER, () => {
    const config = getXeroConfig()
    return new XeroProvider({
      clientId: config.clientId || '',
      clientSecret: config.clientSecret || '',
      redirectUri: config.redirectUri || '',
      scopes: config.scopes || []
    })
  })

  // File Storage
  container.register(TOKENS.FILE_STORAGE, () => {
    // Get S3 config from environment
    let s3Config: S3Config | null = null
    
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      s3Config = {
        region: process.env.AWS_REGION || 'us-east-1',
        bucket: process.env.S3_BUCKET || 'kibly-files',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      }
      
      if (process.env.S3_ENDPOINT) {
        s3Config.endpoint = process.env.S3_ENDPOINT
      }
    }
    
    const storageConfig = {
      provider: 's3' as const,
      s3: s3Config
    }
    return StorageFactory.create(storageConfig) as FileStorage
  })
}

function registerCoreServices(): void {
  // Error Handler
  container.register(TOKENS.ERROR_HANDLER, () => {
    return new ErrorHandler({
      logErrors: true,
      includeStackTrace: process.env.NODE_ENV !== 'production',
      maxRetries: 3
    })
  })

  // Token Management Service
  container.register(TOKENS.TOKEN_MANAGEMENT_SERVICE, () => {
    const integrationRepository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    const xeroProvider = container.resolve<XeroProvider>(TOKENS.XERO_PROVIDER)
    
    return new TokenManagementService(integrationRepository, xeroProvider)
  })

  // Entity Lookup Service
  container.register(TOKENS.ENTITY_LOOKUP_SERVICE, () => {
    return new EntityLookupService()
  })

  // File Service
  container.register(TOKENS.FILE_SERVICE, () => {
    const fileRepository = container.resolve<FileRepository>(TOKENS.FILE_REPOSITORY)
    const fileStorage = container.resolve<FileStorage>(TOKENS.FILE_STORAGE)
    const logger = log
    
    return new FileService(fileRepository, fileStorage, logger)
  })

  // Sync Service - now handled by the DI container in lib/di/services.ts
  // Remove this registration to avoid conflicts
}

function registerUseCases(): void {
  // Trigger Sync Use Case
  container.register(TOKENS.TRIGGER_SYNC_USE_CASE, () => {
    const integrationRepository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    const tenantMemberRepository = container.resolve<TenantMemberRepository>(TOKENS.TENANT_MEMBER_REPOSITORY)
    
    return new TriggerSyncUseCase(
      integrationRepository,
      syncJobRepository,
      tenantMemberRepository
    )
  })

  // Import Transactions Use Case
  container.register(TOKENS.IMPORT_TRANSACTIONS_USE_CASE, () => {
    const transactionRepository = container.resolve<TransactionRepository>(TOKENS.TRANSACTION_REPOSITORY)
    const syncJobRepository = container.resolve<SyncJobRepository>(TOKENS.SYNC_JOB_REPOSITORY)
    const integrationRepository = container.resolve<IntegrationRepository>(TOKENS.INTEGRATION_REPOSITORY)
    const tokenManagementService = container.resolve<TokenManagementService>(TOKENS.TOKEN_MANAGEMENT_SERVICE)
    const entityLookupService = container.resolve<EntityLookupService>(TOKENS.ENTITY_LOOKUP_SERVICE)
    const xeroProvider = container.resolve<XeroProvider>(TOKENS.XERO_PROVIDER)
    const errorHandler = container.resolve<ErrorHandler>(TOKENS.ERROR_HANDLER)
    
    return new ImportTransactionsUseCase(
      transactionRepository,
      syncJobRepository,
      integrationRepository,
      tokenManagementService,
      entityLookupService,
      xeroProvider,
      errorHandler
    )
  })
}

// Convenience functions for commonly used services
export function getService<T>(token: symbol): T {
  return container.resolve<T>(token)
}

export function getTransactionRepository(): TransactionRepository {
  return container.resolve(TOKENS.TRANSACTION_REPOSITORY) as TransactionRepository
}

export function getIntegrationRepository(): IntegrationRepository {
  return container.resolve(TOKENS.INTEGRATION_REPOSITORY) as IntegrationRepository
}

export function getSyncJobRepository(): SyncJobRepository {
  return container.resolve(TOKENS.SYNC_JOB_REPOSITORY) as SyncJobRepository
}

export async function getSyncService() {
  const { getSyncService } = await import('../lib/di/services')
  return getSyncService()
}

export function getImportTransactionsUseCase(): ImportTransactionsUseCase {
  return container.resolve(TOKENS.IMPORT_TRANSACTIONS_USE_CASE) as ImportTransactionsUseCase
}

export function getTokenManagementService(): TokenManagementService {
  return container.resolve(TOKENS.TOKEN_MANAGEMENT_SERVICE) as TokenManagementService
}

export function getEntityLookupService(): EntityLookupService {
  return container.resolve(TOKENS.ENTITY_LOOKUP_SERVICE) as EntityLookupService
}

export function getErrorHandler(): ErrorHandler {
  return container.resolve(TOKENS.ERROR_HANDLER) as ErrorHandler
}

export function getXeroProvider(): XeroProvider {
  return container.resolve(TOKENS.XERO_PROVIDER) as XeroProvider
}