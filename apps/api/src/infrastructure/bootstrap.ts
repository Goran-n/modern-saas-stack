import { container, TOKENS } from '../shared/utils/container'
import { container as oldDIContainer } from '../lib/di'
import { getDatabase } from '../database/connection'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import {
  DrizzleTransactionRepository,
  DrizzleIntegrationRepository,
  DrizzleSyncJobRepository,
  DrizzleTenantRepository,
  DrizzleTenantMemberRepository,
  DrizzleFileRepository,
  DrizzleUserChannelRepository,
  DrizzleConversationRepository,
  DrizzleConversationMessageRepository,
} from './repositories/index'
import {
  DrizzleOrchestrationContextRepository,
  DrizzleAIDecisionRepository,
} from './repositories/orchestration'
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
import { UserChannelService } from '../services/user-channel.service'
import { ConversationService } from '../services/conversation.service'
import { OrchestrationService } from '../services/orchestration.service'
import { PortkeyAIService } from './ai/portkey-ai.service'
import log from '../config/logger'
import { getS3Config } from '../config/config'
import type { UserChannelRepository } from '../core/ports/conversation/user-channel.repository'
import type { ConversationRepository } from '../core/ports/conversation/conversation.repository'
import type { ConversationMessageRepository } from '../core/ports/conversation/conversation-message.repository'
import type { OrchestrationContextRepository, AIDecisionRepository, AIService } from '../core/ports/orchestration'
import type { MessagingService } from '../core/ports/messaging/messaging.service'
import { TwilioMessagingAdapter } from './adapters/messaging/twilio-messaging.adapter'
import { getTwilioConfig } from '../config/config'
import { SyncApplicationService } from '../core/application/sync.application-service'
import { IntegrationApplicationService } from '../core/application/integration.application-service'
import { TenantApplicationService } from '../core/application/tenant.application-service'
import { TenantMemberService } from '../services/tenant-member.service'
import { DrizzleQueryExecutor } from './persistence/drizzle-query-executor'
import type { QueryExecutor } from './persistence/query-executor'
import { setupCommandQueryBuses } from './bootstrap/command-query-setup'

export function bootstrapDependencies(): void {
  try {
    // 1. Register infrastructure
    registerDatabase()
    
    // 2. Register repositories
    registerRepositories()
    
    // 3. Setup command/query buses
    registerCommandQueryBuses()
    
    // 4. Register providers
    registerProviders()
    
    // 5. Register core services
    registerCoreServices()
    
    // 6. Register use cases
    registerUseCases()
    
    // 7. Validate critical dependencies
    validateDependencies()
    
    log.info('Dependency injection container bootstrapped successfully')
  } catch (error) {
    log.error('Failed to bootstrap dependencies:', error)
    throw error
  }
}

export async function initializeAsyncServices(): Promise<void> {
  try {
    log.info('Initializing async application services...')
    
    // Pre-resolve services from old DI container
    const [tenantService, syncService, integrationService, oauthService, syncManagementService, providerService] = await Promise.all([
      oldDIContainer.resolve('TenantService'),
      oldDIContainer.resolve('SyncService'),
      oldDIContainer.resolve('IntegrationService'),
      oldDIContainer.resolve('OAuthService'),
      oldDIContainer.resolve('SyncManagementService'),
      oldDIContainer.resolve('ProviderService')
    ])
    
    // Register the resolved instances
    const tenantMemberRepository = container.resolve<TenantMemberRepository>(TOKENS.TENANT_MEMBER_REPOSITORY)
    const tenantMemberService = new TenantMemberService(tenantMemberRepository)
    
    container.registerInstance(TOKENS.TENANT_APPLICATION_SERVICE, new TenantApplicationService(
      tenantService,
      tenantMemberService
    ))
    
    container.registerInstance(TOKENS.SYNC_APPLICATION_SERVICE, new SyncApplicationService(
      syncService,
      tenantMemberService,
      log
    ))
    
    container.registerInstance(TOKENS.INTEGRATION_APPLICATION_SERVICE, new IntegrationApplicationService(
      integrationService,
      oauthService,
      syncManagementService,
      providerService
    ))
    
    log.info('✅ Async application services initialized')
  } catch (error) {
    log.error('Failed to initialize async services:', error)
    throw error
  }
}

function registerDatabase(): void {
  const db = getDatabase()
  container.registerInstance(TOKENS.DATABASE, db)
  
  // Register QueryExecutor
  const queryExecutor = new DrizzleQueryExecutor(db)
  container.registerInstance(TOKENS.QUERY_EXECUTOR, queryExecutor)
}

function registerRepositories(): void {
  // Tenant Repository
  container.register(TOKENS.TENANT_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleTenantRepository(db)
  })

  // Transaction Repository
  container.register(TOKENS.TRANSACTION_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleTransactionRepository(db)
  })

  // Integration Repository
  container.register(TOKENS.INTEGRATION_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleIntegrationRepository(db)
  })

  // Sync Job Repository
  container.register(TOKENS.SYNC_JOB_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleSyncJobRepository(db)
  })

  // Tenant Member Repository
  container.register(TOKENS.TENANT_MEMBER_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleTenantMemberRepository(db)
  })

  // File Repository
  container.register(TOKENS.FILE_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleFileRepository(db)
  })

  // User Channel Repository - uses QueryExecutor
  container.register(TOKENS.USER_CHANNEL_REPOSITORY, () => {
    const queryExecutor = container.resolve<QueryExecutor>(TOKENS.QUERY_EXECUTOR)
    return new DrizzleUserChannelRepository(queryExecutor)
  })

  // Conversation Repository - uses QueryExecutor
  container.register(TOKENS.CONVERSATION_REPOSITORY, () => {
    const queryExecutor = container.resolve<QueryExecutor>(TOKENS.QUERY_EXECUTOR)
    return new DrizzleConversationRepository(queryExecutor)
  })

  // Conversation Message Repository - uses QueryExecutor
  container.register(TOKENS.CONVERSATION_MESSAGE_REPOSITORY, () => {
    const queryExecutor = container.resolve<QueryExecutor>(TOKENS.QUERY_EXECUTOR)
    return new DrizzleConversationMessageRepository(queryExecutor)
  })

  // Orchestration Context Repository
  container.register(TOKENS.ORCHESTRATION_CONTEXT_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleOrchestrationContextRepository(db, log)
  })

  // AI Decision Repository
  container.register(TOKENS.AI_DECISION_REPOSITORY, () => {
    const db = container.resolve(TOKENS.DATABASE) as any
    return new DrizzleAIDecisionRepository(db, log)
  })
}

function registerCommandQueryBuses(): void {
  const db = container.resolve(TOKENS.DATABASE) as PostgresJsDatabase<any>
  const { commandBus, queryBus } = setupCommandQueryBuses(db)
  
  container.registerInstance(TOKENS.COMMAND_BUS, commandBus)
  container.registerInstance(TOKENS.QUERY_BUS, queryBus)
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
    // Get S3 config from validated configuration
    const s3ConfigData = getS3Config()
    
    if (!s3ConfigData.isConfigured) {
      log.error('❌ CRITICAL ERROR: S3 storage not configured - AWS credentials missing')
      log.error('Required environment variables:')
      log.error('  - AWS_ACCESS_KEY_ID')
      log.error('  - AWS_SECRET_ACCESS_KEY')
      log.error('Please configure these in Doppler or your environment')
      throw new Error('S3 storage configuration is required. AWS credentials are missing.')
    }
    
    const s3Config: S3Config = {
      region: s3ConfigData.region,
      bucket: s3ConfigData.bucket,
      accessKeyId: s3ConfigData.accessKeyId!,
      secretAccessKey: s3ConfigData.secretAccessKey!,
    }
    
    if (s3ConfigData.endpoint) {
      s3Config.endpoint = s3ConfigData.endpoint
    }
    
    log.info('S3 storage configured', {
      bucket: s3ConfigData.bucket,
      region: s3ConfigData.region,
      hasEndpoint: !!s3ConfigData.endpoint
    })
    
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
    
    return new FileService(fileRepository, fileStorage)
  })

  // Messaging Service
  container.register(TOKENS.MESSAGING_SERVICE, () => {
    const config = getTwilioConfig()
    const logger = log
    
    return new TwilioMessagingAdapter(config, logger)
  })

  // User Channel Service
  container.register(TOKENS.USER_CHANNEL_SERVICE, () => {
    const userChannelRepository = container.resolve<UserChannelRepository>(TOKENS.USER_CHANNEL_REPOSITORY)
    
    return new UserChannelService(userChannelRepository)
  })

  // Conversation Service
  container.register(TOKENS.CONVERSATION_SERVICE, () => {
    const conversationRepository = container.resolve<ConversationRepository>(TOKENS.CONVERSATION_REPOSITORY)
    const messageRepository = container.resolve<ConversationMessageRepository>(TOKENS.CONVERSATION_MESSAGE_REPOSITORY)
    const userChannelService = container.resolve<UserChannelService>(TOKENS.USER_CHANNEL_SERVICE)
    
    return new ConversationService(conversationRepository, messageRepository, userChannelService)
  })

  // AI Service
  container.register(TOKENS.AI_SERVICE, () => {
    return new PortkeyAIService(log)
  })

  // Orchestration Service
  container.register(TOKENS.ORCHESTRATION_SERVICE, () => {
    const contextRepository = container.resolve<OrchestrationContextRepository>(TOKENS.ORCHESTRATION_CONTEXT_REPOSITORY)
    const decisionRepository = container.resolve<AIDecisionRepository>(TOKENS.AI_DECISION_REPOSITORY)
    const aiService = container.resolve<AIService>(TOKENS.AI_SERVICE)
    const conversationService = container.resolve<ConversationService>(TOKENS.CONVERSATION_SERVICE)
    const userChannelService = container.resolve<UserChannelService>(TOKENS.USER_CHANNEL_SERVICE)
    const messagingService = container.resolve<MessagingService>(TOKENS.MESSAGING_SERVICE)
    const logger = log
    
    return new OrchestrationService(
      contextRepository,
      decisionRepository,
      aiService,
      conversationService,
      userChannelService,
      messagingService,
      logger
    )
  })

  // Note: Application services (TENANT_APPLICATION_SERVICE, INTEGRATION_APPLICATION_SERVICE, 
  // and SYNC_APPLICATION_SERVICE) are registered in initializeAsyncServices() 
  // because they depend on async resolution from the old DI container
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

function validateDependencies(): void {
  log.info('Validating dependency injection container...')
  
  const criticalTokens = [
    { token: TOKENS.DATABASE, name: 'Database' },
    { token: TOKENS.QUERY_EXECUTOR, name: 'QueryExecutor' },
    { token: TOKENS.USER_CHANNEL_REPOSITORY, name: 'UserChannelRepository' },
    { token: TOKENS.CONVERSATION_REPOSITORY, name: 'ConversationRepository' },
    { token: TOKENS.CONVERSATION_MESSAGE_REPOSITORY, name: 'ConversationMessageRepository' },
    { token: TOKENS.USER_CHANNEL_SERVICE, name: 'UserChannelService' },
    { token: TOKENS.CONVERSATION_SERVICE, name: 'ConversationService' },
    { token: TOKENS.FILE_SERVICE, name: 'FileService' },
    { token: TOKENS.FILE_STORAGE, name: 'FileStorage' },
  ]
  
  const errors: string[] = []
  
  for (const { token, name } of criticalTokens) {
    try {
      const instance = container.resolve(token)
      if (!instance) {
        errors.push(`${name} resolved to null/undefined`)
      }
      
      // Validate specific types
      if (token === TOKENS.QUERY_EXECUTOR && instance) {
        const executor = instance as any
        if (typeof executor.executeMany !== 'function') {
          errors.push(`${name} does not implement executeMany method`)
        }
        if (typeof executor.execute !== 'function') {
          errors.push(`${name} does not implement execute method`)
        }
      }
      
      // Validate repositories have proper methods
      if (name.includes('Repository') && instance) {
        const repo = instance as any
        // Check for common repository methods
        const requiredMethods = ['save', 'findById']
        for (const method of requiredMethods) {
          if (typeof repo[method] !== 'function') {
            errors.push(`${name} does not implement ${method} method`)
          }
        }
      }
    } catch (error) {
      errors.push(`Failed to resolve ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  if (errors.length > 0) {
    log.error('Dependency validation failed:', errors)
    throw new Error(`Dependency validation failed:\n${errors.join('\n')}`)
  }
  
  log.info('✅ All critical dependencies validated successfully')
}