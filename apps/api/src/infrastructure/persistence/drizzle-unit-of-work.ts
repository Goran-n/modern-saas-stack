import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { UnitOfWork } from '../../core/application/shared/unit-of-work'
import type { UserRepository } from '../../core/ports/user.repository'
import type { TenantRepository } from '../../core/ports/tenant.repository'
import type { IntegrationRepository } from '../../core/ports/integration.repository'
import type { FileRepository } from '../../core/ports/file.repository'
import type { ConversationRepository } from '../../core/ports/conversation/conversation.repository'
import { DrizzleUserRepository } from '../repositories/drizzle-user.repository'
import { DrizzleFileRepository } from '../repositories/drizzle-file.repository'
import { DrizzleTenantRepository } from '../repositories/drizzle-tenant.repository'
import { DrizzleIntegrationRepository } from '../repositories/drizzle-integration.repository'
import { DrizzleConversationRepository } from '../repositories/conversation/drizzle-conversation.repository'
import { DrizzleQueryExecutor } from './drizzle-query-executor'

export class DrizzleUnitOfWork implements UnitOfWork {
  private transaction: any = null
  private queryExecutor: DrizzleQueryExecutor
  private _users: UserRepository
  private _files: FileRepository
  private _tenants: TenantRepository
  private _integrations: IntegrationRepository
  private _conversations: ConversationRepository

  constructor(db: PostgresJsDatabase<any>) {
    // Initialize query executor
    this.queryExecutor = new DrizzleQueryExecutor(db)
    
    // Initialize repositories
    this._users = new DrizzleUserRepository(this.queryExecutor)
    this._files = new DrizzleFileRepository(db)
    this._tenants = new DrizzleTenantRepository(db)
    this._integrations = new DrizzleIntegrationRepository(db)
    this._conversations = new DrizzleConversationRepository(this.queryExecutor)
  }

  get users(): UserRepository {
    return this.transaction ? new DrizzleUserRepository(new DrizzleQueryExecutor(this.transaction)) : this._users
  }

  get tenants(): TenantRepository {
    return this.transaction ? new DrizzleTenantRepository(this.transaction) : this._tenants
  }

  get integrations(): IntegrationRepository {
    return this.transaction ? new DrizzleIntegrationRepository(this.transaction) : this._integrations
  }

  get files(): FileRepository {
    return this.transaction ? new DrizzleFileRepository(this.transaction) : this._files
  }

  get conversations(): ConversationRepository {
    return this.transaction ? new DrizzleConversationRepository(new DrizzleQueryExecutor(this.transaction)) : this._conversations
  }

  async commit(): Promise<void> {
    if (this.transaction) {
      // Transaction will be committed automatically by Drizzle
      this.transaction = null
    }
  }

  async rollback(): Promise<void> {
    if (this.transaction) {
      throw new Error('Rollback requested')
    }
  }

  async collectDomainEvents(): Promise<void> {
    // Collect domain events from all aggregates that were modified
    // This would typically involve iterating through all entities
    // and collecting their uncommitted events
    
    // For now, this is a placeholder
    // In a full implementation, you'd maintain a list of modified aggregates
    // and collect events from them
  }

  async publishDomainEvents(): Promise<void> {
    // Publish collected domain events to event bus
    // This would typically involve:
    // 1. Getting all collected events
    // 2. Publishing them to an event bus
    // 3. Marking events as committed on the aggregates
    
    // For now, this is a placeholder
    console.log('Domain events would be published here')
  }

  // Factory method to create a transactional unit of work
  static async createTransactional<T>(
    db: PostgresJsDatabase<any>,
    operation: (uow: UnitOfWork) => Promise<T>
  ): Promise<T> {
    return db.transaction(async (tx) => {
      const uow = new DrizzleUnitOfWork(db)
      uow.transaction = tx
      return operation(uow)
    })
  }
}