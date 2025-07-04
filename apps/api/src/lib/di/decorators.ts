import 'reflect-metadata'
import { container } from './index'

const INJECT_METADATA_KEY = Symbol('inject')
const INJECTABLE_METADATA_KEY = Symbol('injectable')

export function Injectable(token?: string, scope: 'singleton' | 'request' = 'singleton') {
  return function <T extends { new(...args: any[]): {} }>(constructor: T) {
    const serviceToken = token || constructor.name
    Reflect.defineMetadata(INJECTABLE_METADATA_KEY, serviceToken, constructor)
    
    // Auto-register if not already registered
    if (!container.isRegistered(serviceToken)) {
      const paramTypes = Reflect.getMetadata('design:paramtypes', constructor) || []
      const metadata = Reflect.getMetadata(INJECT_METADATA_KEY, constructor)
      const dependencies = paramTypes.map((_: any, index: number) => {
        return metadata?.[index]
      }).filter(Boolean)
      
      // Debug logging for dependency resolution
      console.log(`@Injectable('${serviceToken}') dependencies:`, {
        paramTypes: paramTypes.map((t: any) => t?.name || 'unknown'),
        metadata,
        resolvedDependencies: dependencies
      })
      
      container.register(serviceToken, {
        useClass: constructor,
        dependencies
      }, scope)
    }
    
    return constructor
  }
}

export function Inject(token: string) {
  return function (target: any, propertyKey: string | symbol | undefined, parameterIndex: number) {
    if (propertyKey === undefined) {
      // Constructor parameter injection
      const existingTokens = Reflect.getMetadata(INJECT_METADATA_KEY, target) || []
      existingTokens[parameterIndex] = token
      Reflect.defineMetadata(INJECT_METADATA_KEY, existingTokens, target)
    } else {
      // Property injection
      Object.defineProperty(target, propertyKey, {
        get: () => container.resolve(token),
        enumerable: true,
        configurable: true
      })
    }
  }
}