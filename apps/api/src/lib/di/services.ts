import { container, registerCoreServices } from './index'
import { TenantService } from '../../services/tenant.service'
import { TenantMemberService } from '../../services/tenant-member.service'
import { UserService } from '../../services/user.service'
import { IntegrationService } from '../../services/integration.service'
import { SyncService } from '../../services/sync.service'
import { SyncJobService } from '../../services/sync-job.service'
import { TransactionService } from '../../services/transaction.service'
import { AccountService } from '../../services/account.service'
import { BankFeedService } from '../../services/bank-feed.service'
import { SupplierService } from '../../services/supplier.service'
import log from '../../config/logger'


export async function registerServices(): Promise<void> {
  console.log('registerServices: Starting service registration...')
  // Register core services first (includes repositories)
  console.log('registerServices: Calling registerCoreServices...')
  registerCoreServices()
  console.log('registerServices: Core services registered')

  // Register services
  container.register('TenantService', {
    useFactory: () => new TenantService(),
  }, 'singleton')

  container.register('TenantMemberService', {
    useFactory: () => new TenantMemberService(),
  }, 'singleton')

  container.register('UserService', {
    useClass: UserService,
    dependencies: ['UserRepository', 'Logger'],
  }, 'singleton')

  // Import services to trigger @Injectable decorator registration
  console.log('registerServices: About to import services with @Injectable decorators...')
  await import('../../services/oauth.service')
  await import('../../services/provider.service')
  await import('../../services/sync-management.service')
  
  // Manually register IntegrationCrudService to ensure proper dependency resolution
  const { IntegrationCrudService } = await import('../../services/integration-crud.service')
  console.log('registerServices: Manually registering IntegrationCrudService...')
  container.register('IntegrationCrudService', {
    useClass: IntegrationCrudService,
    dependencies: ['IntegrationRepository', 'OAuthService', 'ProviderService', 'Logger']
  }, 'singleton')
  
  console.log('registerServices: All @Injectable services imported and registered')

  // Legacy service wrapper for backwards compatibility
  container.register('IntegrationService', {
    useFactory: async () => {
      try {
        const crud = await container.resolve('IntegrationCrudService')
        const oauth = await container.resolve('OAuthService')
        const provider = await container.resolve('ProviderService')
        const sync = await container.resolve('SyncManagementService')
        
        // Create services manually if DI resolution fails
        if (!crud) {
          throw new Error('IntegrationCrudService could not be resolved')
        }
        
        // Create provider and oauth services manually with proper dependencies
        const xeroClientFactory = await container.resolve('XeroClientFactory')
        const logger = await container.resolve('Logger')
        const integrationRepository = await container.resolve('IntegrationRepository')
        
        const oauthService = oauth || new (await import('../../services/oauth.service')).OAuthService(
          integrationRepository,
          xeroClientFactory,
          logger
        )
        const providerService = provider || new (await import('../../services/provider.service')).ProviderService(
          xeroClientFactory,
          oauthService,
          logger
        )
        const syncService = sync || await container.resolve('SyncManagementService')
        
        // Create a facade that delegates to the new services
        return {
          create: crud.create.bind(crud),
          getById: crud.getById.bind(crud),
          getByTenant: crud.getByTenant.bind(crud),
          update: crud.update.bind(crud),
          delete: crud.delete.bind(crud),
          getAuthUrl: oauthService.getAuthUrl.bind(oauthService),
          completeAuth: crud.completeOAuthSetup.bind(crud),
          completeAuthWithOrganisation: crud.completeOAuthSetup.bind(crud),
          getAvailableOrganisations: oauthService.getAvailableOrganisations.bind(oauthService),
          testConnection: crud.testConnection.bind(crud),
          getSupportedProviders: providerService.getSupportedProviders.bind(providerService),
          triggerSync: syncService.triggerSync.bind(syncService),
          getSyncLogs: syncService.getSyncLogs.bind(syncService),
          validateProviderConnection: providerService.validateProviderConnection.bind(providerService)
        }
      } catch (error) {
        log.error('Failed to create IntegrationService facade:', error)
        throw new Error(`IntegrationService factory failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    },
  }, 'request')

  container.register('SyncService', {
    useClass: SyncService,
    dependencies: ['SyncJobRepository', 'TransactionRepository', 'IntegrationRepository', 'TenantMemberRepository', 'Logger'],
  }, 'request')

  container.register('SyncJobService', {
    useClass: SyncJobService,
    dependencies: ['SyncJobRepository', 'IntegrationRepository', 'Logger'],
  }, 'request')

  container.register('TransactionService', {
    useClass: TransactionService,
    dependencies: ['TransactionRepository', 'Logger'],
  }, 'request')

  container.register('AccountService', {
    useFactory: () => new AccountService(),
  }, 'singleton')

  container.register('BankFeedService', {
    useFactory: () => new BankFeedService(),
  }, 'singleton')

  container.register('SupplierService', {
    useFactory: () => new SupplierService(),
  }, 'singleton')
}

// Helper functions to get services
export async function getTenantService(): Promise<TenantService> {
  return await container.resolve<TenantService>('TenantService')
}

export async function getTenantMemberService(): Promise<TenantMemberService> {
  return await container.resolve<TenantMemberService>('TenantMemberService')
}

export async function getUserService(): Promise<UserService> {
  return container.resolve<UserService>('UserService')
}

export async function getIntegrationService(): Promise<IntegrationService> {
  return container.resolve<IntegrationService>('IntegrationService')
}

export async function getSyncService(): Promise<SyncService> {
  return container.resolve<SyncService>('SyncService')
}

export async function getSyncJobService(): Promise<SyncJobService> {
  return container.resolve<SyncJobService>('SyncJobService')
}

export async function getTransactionService(): Promise<TransactionService> {
  return container.resolve<TransactionService>('TransactionService')
}

export async function getAccountService(): Promise<AccountService> {
  return container.resolve<AccountService>('AccountService')
}

export async function getBankFeedService(): Promise<BankFeedService> {
  return container.resolve<BankFeedService>('BankFeedService')
}

export async function getSupplierService(): Promise<SupplierService> {
  return container.resolve<SupplierService>('SupplierService')
}