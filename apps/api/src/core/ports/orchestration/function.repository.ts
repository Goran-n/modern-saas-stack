import type { AIFunction } from '@kibly/shared-types'

export interface FunctionRepository {
  findById(id: string): Promise<AIFunction | null>
  findByName(name: string): Promise<AIFunction | null>
  findActive(): Promise<AIFunction[]>
  findByPermission(permission: string): Promise<AIFunction[]>
  
  save(func: AIFunction): Promise<AIFunction>
  update(id: string, updates: Partial<AIFunction>): Promise<AIFunction>
  delete(id: string): Promise<boolean>
  
  // Activation/deactivation
  activate(id: string): Promise<void>
  deactivate(id: string): Promise<void>
}