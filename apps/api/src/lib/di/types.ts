export interface ServiceConstructor<T = any> {
  new (...args: any[]): T
}

export interface ServiceFactory<T = any> {
  (): T | Promise<T>
}

export interface ServiceProvider<T = any> {
  useClass?: ServiceConstructor<T>
  useFactory?: ServiceFactory<T>
  useValue?: T
  dependencies?: string[]
}

export interface ContainerOptions {
  enableLogging?: boolean
  scopePrefix?: string
}

export type ServiceScope = 'singleton' | 'transient' | 'request'

export interface ServiceMetadata<T = any> {
  token: string
  provider: ServiceProvider<T>
  scope: ServiceScope
  instance?: T
}