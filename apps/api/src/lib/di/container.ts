import type { 
  ServiceProvider, 
  ServiceMetadata, 
  ServiceScope,
  ContainerOptions 
} from './types'
import log from '../../config/logger'

export class DIContainer {
  private services = new Map<string, ServiceMetadata>()
  private instances = new Map<string, any>()
  private requestScoped = new Map<string, any>()
  private options: ContainerOptions

  constructor(options: ContainerOptions = {}) {
    this.options = {
      enableLogging: false,
      scopePrefix: 'DI:',
      ...options
    }
  }

  register<T = any>(
    token: string, 
    provider: ServiceProvider<T>, 
    scope: ServiceScope = 'singleton'
  ): void {
    if (this.services.has(token)) {
      throw new Error(`Service '${token}' is already registered`)
    }

    this.services.set(token, {
      token,
      provider,
      scope
    })

    // Always log service registration for debugging
    console.log(`DI: Registered service '${token}' with scope '${scope}'`)
    
    if (this.options.enableLogging) {
      log.debug(`${this.options.scopePrefix}Registered service '${token}' with scope '${scope}'`)
    }
  }

  isRegistered(token: string): boolean {
    return this.services.has(token)
  }

  async resolve<T = any>(token: string): Promise<T> {
    console.log(`DI: Attempting to resolve '${token}'`)
    const metadata = this.services.get(token)
    if (!metadata) {
      const registeredTokens = Array.from(this.services.keys())
      console.error(`Service '${token}' not found. Registered services:`, registeredTokens)
      throw new Error(`Service '${token}' not found. Available services: ${registeredTokens.join(', ')}`)
    }

    // Handle different scopes
    switch (metadata.scope) {
      case 'singleton':
        return this.resolveSingleton(metadata)
      case 'transient':
        return this.resolveTransient(metadata)
      case 'request':
        return this.resolveRequest(metadata)
      default:
        throw new Error(`Unknown scope '${metadata.scope}'`)
    }
  }

  private async resolveSingleton<T>(metadata: ServiceMetadata): Promise<T> {
    const cached = this.instances.get(metadata.token)
    if (cached) {
      return cached as T
    }

    const instance = await this.createInstance(metadata)
    this.instances.set(metadata.token, instance)
    return instance as T
  }

  private async resolveTransient<T>(metadata: ServiceMetadata): Promise<T> {
    return this.createInstance(metadata)
  }

  private async resolveRequest<T>(metadata: ServiceMetadata): Promise<T> {
    const cached = this.requestScoped.get(metadata.token)
    if (cached) {
      return cached as T
    }

    const instance = await this.createInstance(metadata)
    this.requestScoped.set(metadata.token, instance)
    return instance as T
  }

  private async createInstance<T>(metadata: ServiceMetadata): Promise<T> {
    const { provider } = metadata

    try {
      if (provider.useValue !== undefined) {
        return provider.useValue as T
      }

      if (provider.useFactory) {
        const dependencies = await this.resolveDependencies(provider.dependencies || [])
        const result = (provider.useFactory as any)(...dependencies) as T
        if (result === undefined || result === null) {
          throw new Error(`Factory for '${metadata.token}' returned ${result}`)
        }
        return result
      }

      if (provider.useClass) {
        const dependencies = await this.resolveDependencies(provider.dependencies || [])
        const instance = new provider.useClass(...dependencies) as T
        if (instance === undefined || instance === null) {
          throw new Error(`Constructor for '${metadata.token}' returned ${instance}`)
        }
        return instance
      }

      throw new Error(`Invalid provider for service '${metadata.token}'`)
    } catch (error) {
      console.error(`Failed to create instance of '${metadata.token}':`, error)
      throw new Error(`Dependency injection failed for '${metadata.token}': ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  private async resolveDependencies(tokens: string[]): Promise<any[]> {
    const dependencies = []
    for (const token of tokens) {
      const dependency = await this.resolve(token)
      dependencies.push(dependency)
    }
    return dependencies
  }

  clearRequestScope(): void {
    this.requestScoped.clear()
    if (this.options.enableLogging) {
      log.debug(`${this.options.scopePrefix}Cleared request scope`)
    }
  }

  clearAll(): void {
    this.instances.clear()
    this.requestScoped.clear()
    this.services.clear()
  }

  // Helper methods for testing

  getRegisteredTokens(): string[] {
    return Array.from(this.services.keys())
  }
}