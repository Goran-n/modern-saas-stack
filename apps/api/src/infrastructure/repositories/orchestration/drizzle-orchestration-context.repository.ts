import { eq, desc, lt, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { Logger } from 'pino'

import { orchestrationContexts } from '../../../database/schema'
import type { OrchestrationContextRepository } from '../../../core/ports/orchestration'
import { OrchestrationContextEntity } from '../../../core/domain/orchestration'
import { EntityId } from '../../../core/domain/shared/value-objects/entity-id'

export class DrizzleOrchestrationContextRepository implements OrchestrationContextRepository {
  constructor(
    private db: PostgresJsDatabase,
    private logger: Logger
  ) {}

  async findById(id: string): Promise<OrchestrationContextEntity | null> {
    try {
      const result = await this.db
        .select()
        .from(orchestrationContexts)
        .where(eq(orchestrationContexts.id, id))
        .limit(1)

      if (!result[0]) {
        return null
      }

      return this.toDomainEntity(result[0])
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to find orchestration context by id')
      throw error
    }
  }

  async findByConversationId(conversationId: string): Promise<OrchestrationContextEntity | null> {
    try {
      const result = await this.db
        .select()
        .from(orchestrationContexts)
        .where(eq(orchestrationContexts.conversationId, conversationId))
        .limit(1)

      if (!result[0]) {
        return null
      }

      return this.toDomainEntity(result[0])
    } catch (error) {
      this.logger.error({ error, conversationId }, 'Failed to find orchestration context by conversation id')
      throw error
    }
  }

  async findByUserId(userId: string, limit = 10): Promise<OrchestrationContextEntity[]> {
    try {
      const result = await this.db
        .select()
        .from(orchestrationContexts)
        .where(eq(orchestrationContexts.userId, userId))
        .orderBy(desc(orchestrationContexts.lastActivity))
        .limit(limit)

      return result.map(row => this.toDomainEntity(row))
    } catch (error) {
      this.logger.error({ error, userId }, 'Failed to find orchestration contexts by user id')
      throw error
    }
  }

  async findActive(olderThan: Date): Promise<OrchestrationContextEntity[]> {
    try {
      const result = await this.db
        .select()
        .from(orchestrationContexts)
        .where(lt(orchestrationContexts.lastActivity, olderThan))
        .orderBy(desc(orchestrationContexts.lastActivity))

      return result.map(row => this.toDomainEntity(row))
    } catch (error) {
      this.logger.error({ error, olderThan }, 'Failed to find active orchestration contexts')
      throw error
    }
  }

  async save(context: OrchestrationContextEntity): Promise<OrchestrationContextEntity> {
    try {
      const data = this.toPersistence(context)
      
      const result = await this.db
        .insert(orchestrationContexts)
        .values(data)
        .onConflictDoUpdate({
          target: orchestrationContexts.id,
          set: {
            ...data,
            updatedAt: new Date(),
            version: sql`${orchestrationContexts.version} + 1`
          }
        })
        .returning()

      this.logger.info({ contextId: context.id.toString() }, 'Orchestration context saved')
      
      return this.toDomainEntity(result[0])
    } catch (error) {
      this.logger.error({ error, contextId: context.id.toString() }, 'Failed to save orchestration context')
      throw error
    }
  }

  async delete(id: string): Promise<boolean> {
    try {
      const result = await this.db
        .delete(orchestrationContexts)
        .where(eq(orchestrationContexts.id, id))
        .returning({ id: orchestrationContexts.id })

      return result.length > 0
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to delete orchestration context')
      throw error
    }
  }

  async deleteInactive(olderThan: Date): Promise<number> {
    try {
      const result = await this.db
        .delete(orchestrationContexts)
        .where(lt(orchestrationContexts.lastActivity, olderThan))
        .returning({ id: orchestrationContexts.id })

      this.logger.info({ count: result.length, olderThan }, 'Deleted inactive orchestration contexts')
      
      return result.length
    } catch (error) {
      this.logger.error({ error, olderThan }, 'Failed to delete inactive orchestration contexts')
      throw error
    }
  }

  async pruneOldMessages(contextId: string, keepCount: number): Promise<void> {
    try {
      const context = await this.findById(contextId)
      if (!context) {
        throw new Error(`Context not found: ${contextId}`)
      }

      const messages = context.recentMessages
      if (messages.length <= keepCount) {
        return
      }

      // Keep only the most recent messages
      const prunedMessages = messages.slice(-keepCount)
      
      await this.db
        .update(orchestrationContexts)
        .set({
          recentMessages: prunedMessages,
          updatedAt: new Date()
        })
        .where(eq(orchestrationContexts.id, contextId))

      this.logger.info({ contextId, keepCount, pruned: messages.length - keepCount }, 'Pruned old messages')
    } catch (error) {
      this.logger.error({ error, contextId, keepCount }, 'Failed to prune old messages')
      throw error
    }
  }

  private toDomainEntity(row: typeof orchestrationContexts.$inferSelect): OrchestrationContextEntity {
    return OrchestrationContextEntity.fromProps({
      id: new EntityId(row.id),
      conversationId: row.conversationId,
      userId: row.userId,
      channelId: row.channelId,
      tenantId: row.tenantId,
      recentMessages: row.recentMessages as any,
      currentIntent: row.currentIntent as any,
      pendingActions: row.pendingActions as any,
      sessionData: row.sessionData as any,
      lastActivity: row.lastActivity,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version
    })
  }

  private toPersistence(entity: OrchestrationContextEntity): typeof orchestrationContexts.$inferInsert {
    const publicData = entity.toPublic()
    
    return {
      id: entity.id.toString(),
      conversationId: publicData.conversationId,
      userId: publicData.userId,
      channelId: publicData.channelId,
      tenantId: publicData.tenantId,
      recentMessages: publicData.recentMessages,
      currentIntent: publicData.currentIntent,
      pendingActions: publicData.pendingActions,
      sessionData: publicData.sessionData,
      lastActivity: publicData.lastActivity,
      createdAt: publicData.createdAt,
      updatedAt: publicData.updatedAt,
      version: 1 // Will be incremented by SQL
    }
  }
}