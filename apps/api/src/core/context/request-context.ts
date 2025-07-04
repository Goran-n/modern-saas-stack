import { AsyncLocalStorage } from 'node:async_hooks'
import type { IntegrationEntity } from '../domain/integration/integration.entity'
import { getTokenConfig } from '../../config/sync.config'
import logger from '@vepler/logger'

export interface RequestContext {
  requestId: string
  tenantId: string
  integrationId?: string
  userId?: string
  correlationId?: string
  startTime: number
}

export interface XeroRequestContext extends RequestContext {
  integrationId: string
  xeroTenantId: string
  credentials: {
    accessToken: string
    refreshToken: string
    expiresIn: number
    tokenType: string
  }
}

// AsyncLocalStorage provides request-scoped storage that works across async boundaries
const asyncLocalStorage = new AsyncLocalStorage<RequestContext>()

export class RequestContextManager {
  static run<T>(context: RequestContext, fn: () => T | Promise<T>): T | Promise<T> {
    return asyncLocalStorage.run(context, fn)
  }

  static get(): RequestContext | undefined {
    return asyncLocalStorage.getStore()
  }

  static getOrFail(): RequestContext {
    const context = asyncLocalStorage.getStore()
    if (!context) {
      throw new Error('No request context available. Ensure code is running within RequestContextManager.run()')
    }
    return context
  }

  static getTenantId(): string {
    const context = this.getOrFail()
    return context.tenantId
  }

  static getIntegrationId(): string | undefined {
    return this.get()?.integrationId
  }

  static getRequestId(): string {
    const context = this.getOrFail()
    return context.requestId
  }

  static createContext(params: {
    tenantId: string
    integrationId?: string
    userId?: string
    correlationId?: string
  }): RequestContext {
    const context: RequestContext = {
      requestId: crypto.randomUUID(),
      tenantId: params.tenantId,
      startTime: Date.now()
    }
    
    // Only add optional properties if they exist
    if (params.integrationId) {
      context.integrationId = params.integrationId
    }
    if (params.userId) {
      context.userId = params.userId
    }
    if (params.correlationId) {
      context.correlationId = params.correlationId
    }
    
    return context
  }

  static createXeroContext(integration: IntegrationEntity): XeroRequestContext {
    const authData = integration.authData as any
    
    // Detailed validation with helpful error messages
    const missingFields: string[] = []
    if (!authData.accessToken) missingFields.push('accessToken')
    if (!authData.refreshToken) missingFields.push('refreshToken') 
    if (!authData.tenantId) missingFields.push('tenantId')
    
    if (missingFields.length > 0) {
      logger.error('Invalid Xero auth data', {
        integrationId: integration.id,
        tenantId: integration.tenantId,
        missingFields,
        authDataKeys: Object.keys(authData),
        hasAuthData: !!authData
      })
      throw new Error(`Invalid Xero auth data: missing required fields: ${missingFields.join(', ')}. This usually means the integration needs to be re-authenticated.`)
    }

    return {
      requestId: crypto.randomUUID(),
      tenantId: integration.tenantId,
      integrationId: integration.id,
      xeroTenantId: authData.tenantId,
      startTime: Date.now(),
      credentials: {
        accessToken: authData.accessToken,
        refreshToken: authData.refreshToken,
        expiresIn: authData.expiresIn || getTokenConfig().defaultExpirySeconds,
        tokenType: authData.tokenType || 'Bearer'
      }
    }
  }

  static isXeroContext(context: RequestContext): context is XeroRequestContext {
    return 'xeroTenantId' in context && 'credentials' in context
  }

  static getXeroContext(): XeroRequestContext {
    const context = this.getOrFail()
    if (!this.isXeroContext(context)) {
      throw new Error('Current context is not a Xero context')
    }
    return context
  }
}

// Export a convenience function for running operations in context
export function runInContext<T>(
  context: RequestContext,
  operation: () => T | Promise<T>
): T | Promise<T> {
  return RequestContextManager.run(context, operation)
}

// Export type guard
export function isXeroRequestContext(context: RequestContext): context is XeroRequestContext {
  return RequestContextManager.isXeroContext(context)
}