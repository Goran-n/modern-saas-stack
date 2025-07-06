export type ServiceFactory<T = any> = () => T
export type ServiceInstance<T = any> = T

export interface ServiceDefinition<T = any> {
  factory: ServiceFactory<T>
  singleton: boolean
  instance?: ServiceInstance<T>
}

export class Container {
  private services = new Map<string | symbol, ServiceDefinition>()
  private static instance: Container

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container()
    }
    return Container.instance
  }

  register<T>(
    token: string | symbol,
    factory: ServiceFactory<T>,
    options: { singleton?: boolean } = {}
  ): void {
    const { singleton = true } = options
    
    this.services.set(token, {
      factory,
      singleton,
    })
  }

  registerInstance<T>(token: string | symbol, instance: T): void {
    this.services.set(token, {
      factory: () => instance,
      singleton: true,
      instance,
    })
  }

  resolve<T>(token: string | symbol): T {
    const service = this.services.get(token)
    
    if (!service) {
      throw new Error(`Service not found: ${String(token)}`)
    }

    if (service.singleton) {
      if (!service.instance) {
        service.instance = service.factory()
      }
      return service.instance as T
    }

    return service.factory() as T
  }

  has(token: string | symbol): boolean {
    return this.services.has(token)
  }

  clear(): void {
    this.services.clear()
  }

  reset(): void {
    for (const service of this.services.values()) {
      if (service.singleton) {
        delete service.instance
      }
    }
  }
}

export const container = Container.getInstance()

// Service tokens
export const TOKENS = {
  // Database
  DATABASE: Symbol('Database'),
  QUERY_EXECUTOR: Symbol('QueryExecutor'),
  
  // Repositories
  TENANT_REPOSITORY: Symbol('TenantRepository'),
  TENANT_MEMBER_REPOSITORY: Symbol('TenantMemberRepository'),
  USER_REPOSITORY: Symbol('UserRepository'),
  INTEGRATION_REPOSITORY: Symbol('IntegrationRepository'),
  TRANSACTION_REPOSITORY: Symbol('TransactionRepository'),
  SYNC_JOB_REPOSITORY: Symbol('SyncJobRepository'),
  FILE_REPOSITORY: Symbol('FileRepository'),
  USER_CHANNEL_REPOSITORY: Symbol('UserChannelRepository'),
  CONVERSATION_REPOSITORY: Symbol('ConversationRepository'),
  CONVERSATION_MESSAGE_REPOSITORY: Symbol('ConversationMessageRepository'),
  ORCHESTRATION_CONTEXT_REPOSITORY: Symbol('OrchestrationContextRepository'),
  AI_DECISION_REPOSITORY: Symbol('AIDecisionRepository'),
  
  // Application Services (CQRS-based)
  COMMAND_BUS: Symbol('CommandBus'),
  QUERY_BUS: Symbol('QueryBus'),
  TOKEN_MANAGEMENT_SERVICE: Symbol('TokenManagementService'),
  ENTITY_LOOKUP_SERVICE: Symbol('EntityLookupService'),
  ERROR_HANDLER: Symbol('ErrorHandler'),
  FILE_SERVICE: Symbol('FileService'),
  FILE_STORAGE: Symbol('FileStorage'),
  USER_CHANNEL_SERVICE: Symbol('UserChannelService'),
  CONVERSATION_SERVICE: Symbol('ConversationService'),
  MESSAGING_SERVICE: Symbol('MessagingService'),
  ORCHESTRATION_SERVICE: Symbol('OrchestrationService'),
  AI_SERVICE: Symbol('AIService'),
  SYNC_APPLICATION_SERVICE: Symbol('SyncApplicationService'),
  INTEGRATION_APPLICATION_SERVICE: Symbol('IntegrationApplicationService'),
  TENANT_APPLICATION_SERVICE: Symbol('TenantApplicationService'),
  
  // Providers
  XERO_PROVIDER: Symbol('XeroProvider'),
  
  // Use Cases
  TRIGGER_SYNC_USE_CASE: Symbol('TriggerSyncUseCase'),
  IMPORT_TRANSACTIONS_USE_CASE: Symbol('ImportTransactionsUseCase'),
  
  // External services
  EMAIL_SERVICE: Symbol('EmailService'),
  LOGGER: Symbol('Logger'),
} as const

export type ServiceToken = typeof TOKENS[keyof typeof TOKENS]

// Helper function to set up the container
export async function setupContainer(): Promise<void> {
  const { bootstrapDependencies } = await import('../../infrastructure/bootstrap')
  bootstrapDependencies()
}