import type { PromptTemplate } from '@kibly/shared-types'

export interface PromptRepository {
  findById(id: string): Promise<PromptTemplate | null>
  findByName(name: string): Promise<PromptTemplate | null>
  findByCategory(category: string): Promise<PromptTemplate[]>
  findActive(): Promise<PromptTemplate[]>
  
  save(template: PromptTemplate): Promise<PromptTemplate>
  update(id: string, updates: Partial<PromptTemplate>): Promise<PromptTemplate>
  delete(id: string): Promise<boolean>
  
  // Activation/deactivation
  activate(id: string): Promise<void>
  deactivate(id: string): Promise<void>
}