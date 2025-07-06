// Use proper repository interfaces from ports layer
import type { UserRepository } from '../../ports/user.repository'
import type { TenantRepository } from '../../ports/tenant.repository'
import type { IntegrationRepository } from '../../ports/integration.repository'
import type { FileRepository } from '../../ports/file.repository'
import type { ConversationRepository } from '../../ports/conversation/conversation.repository'

export interface UnitOfWork {
  // Repository access
  readonly users: UserRepository
  readonly tenants: TenantRepository
  readonly integrations: IntegrationRepository
  readonly files: FileRepository
  readonly conversations: ConversationRepository
  
  // Transaction management
  commit(): Promise<void>
  rollback(): Promise<void>
  
  // Event handling
  collectDomainEvents(): Promise<void>
  publishDomainEvents(): Promise<void>
}