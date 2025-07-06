import { eq, desc, and, gte, lte, sql } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import type { Logger } from 'pino'

import { aiDecisions } from '../../../database/schema'
import type { AIDecisionRepository, AIDecisionFilters } from '../../../core/ports/orchestration'
import { AIDecisionEntity } from '../../../core/domain/orchestration'
import { EntityId } from '../../../core/domain/shared/value-objects/entity-id'

export class DrizzleAIDecisionRepository implements AIDecisionRepository {
  constructor(
    private db: PostgresJsDatabase,
    private logger: Logger
  ) {}

  async findById(id: string): Promise<AIDecisionEntity | null> {
    try {
      const result = await this.db
        .select()
        .from(aiDecisions)
        .where(eq(aiDecisions.id, id))
        .limit(1)

      if (!result[0]) {
        return null
      }

      return this.toDomainEntity(result[0])
    } catch (error) {
      this.logger.error({ error, id }, 'Failed to find AI decision by id')
      throw error
    }
  }

  async findByConversationId(conversationId: string, limit = 50): Promise<AIDecisionEntity[]> {
    try {
      const result = await this.db
        .select()
        .from(aiDecisions)
        .where(eq(aiDecisions.conversationId, conversationId))
        .orderBy(desc(aiDecisions.createdAt))
        .limit(limit)

      return result.map(row => this.toDomainEntity(row))
    } catch (error) {
      this.logger.error({ error, conversationId }, 'Failed to find AI decisions by conversation id')
      throw error
    }
  }

  async findByContextId(contextId: string): Promise<AIDecisionEntity[]> {
    try {
      const result = await this.db
        .select()
        .from(aiDecisions)
        .where(eq(aiDecisions.contextId, contextId))
        .orderBy(desc(aiDecisions.createdAt))

      return result.map(row => this.toDomainEntity(row))
    } catch (error) {
      this.logger.error({ error, contextId }, 'Failed to find AI decisions by context id')
      throw error
    }
  }

  async findByFilters(
    filters: AIDecisionFilters,
    limit = 50,
    offset = 0
  ): Promise<{ decisions: AIDecisionEntity[]; total: number }> {
    try {
      const conditions = []

      if (filters.conversationId) {
        conditions.push(eq(aiDecisions.conversationId, filters.conversationId))
      }
      if (filters.contextId) {
        conditions.push(eq(aiDecisions.contextId, filters.contextId))
      }
      if (filters.modelUsed) {
        conditions.push(eq(aiDecisions.modelUsed, filters.modelUsed))
      }
      if (filters.fromDate) {
        conditions.push(gte(aiDecisions.createdAt, filters.fromDate))
      }
      if (filters.toDate) {
        conditions.push(lte(aiDecisions.createdAt, filters.toDate))
      }
      if (filters.hadPermissionIssues !== undefined) {
        if (filters.hadPermissionIssues) {
          conditions.push(sql`${aiDecisions.permissionsDenied} IS NOT NULL AND jsonb_array_length(${aiDecisions.permissionsDenied}) > 0`)
        } else {
          conditions.push(sql`${aiDecisions.permissionsDenied} IS NULL OR jsonb_array_length(${aiDecisions.permissionsDenied}) = 0`)
        }
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined

      // Get total count
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(aiDecisions)
        .where(whereClause)

      const total = Number(countResult[0].count)

      // Get paginated results
      const result = await this.db
        .select()
        .from(aiDecisions)
        .where(whereClause)
        .orderBy(desc(aiDecisions.createdAt))
        .limit(limit)
        .offset(offset)

      return {
        decisions: result.map(row => this.toDomainEntity(row)),
        total
      }
    } catch (error) {
      this.logger.error({ error, filters }, 'Failed to find AI decisions by filters')
      throw error
    }
  }

  async save(decision: AIDecisionEntity): Promise<AIDecisionEntity> {
    try {
      const data = this.toPersistence(decision)
      
      const result = await this.db
        .insert(aiDecisions)
        .values(data)
        .returning()

      this.logger.info({ decisionId: decision.id.toString() }, 'AI decision saved')
      
      return this.toDomainEntity(result[0])
    } catch (error) {
      this.logger.error({ error, decisionId: decision.id.toString() }, 'Failed to save AI decision')
      throw error
    }
  }

  async getTokenUsageByModel(
    tenantId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<{ model: string; totalTokens: number; totalDecisions: number }[]> {
    try {
      const result = await this.db
        .select({
          model: aiDecisions.modelUsed,
          totalTokens: sql<number>`sum(${aiDecisions.tokensUsed})`,
          totalDecisions: sql<number>`count(*)`
        })
        .from(aiDecisions)
        .where(
          and(
            sql`${aiDecisions.conversationId} IN (
              SELECT id FROM conversations WHERE tenant_id = ${tenantId}
            )`,
            gte(aiDecisions.createdAt, fromDate),
            lte(aiDecisions.createdAt, toDate)
          )
        )
        .groupBy(aiDecisions.modelUsed)
        .orderBy(desc(sql`sum(${aiDecisions.tokensUsed})`))

      return result.map(row => ({
        model: row.model,
        totalTokens: Number(row.totalTokens),
        totalDecisions: Number(row.totalDecisions)
      }))
    } catch (error) {
      this.logger.error({ error, tenantId, fromDate, toDate }, 'Failed to get token usage by model')
      throw error
    }
  }

  async getIntentDistribution(
    tenantId: string,
    fromDate: Date,
    toDate: Date
  ): Promise<{ intentType: string; intentSubType?: string; count: number }[]> {
    try {
      const result = await this.db
        .select({
          intentType: sql<string>`${aiDecisions.intent}->>'type'`,
          intentSubType: sql<string>`${aiDecisions.intent}->>'subType'`,
          count: sql<number>`count(*)`
        })
        .from(aiDecisions)
        .where(
          and(
            sql`${aiDecisions.conversationId} IN (
              SELECT id FROM conversations WHERE tenant_id = ${tenantId}
            )`,
            gte(aiDecisions.createdAt, fromDate),
            lte(aiDecisions.createdAt, toDate)
          )
        )
        .groupBy(
          sql`${aiDecisions.intent}->>'type'`,
          sql`${aiDecisions.intent}->>'subType'`
        )
        .orderBy(desc(sql`count(*)`))

      return result.map(row => {
        const item: { intentType: string; intentSubType?: string; count: number } = {
          intentType: row.intentType,
          count: Number(row.count)
        }
        if (row.intentSubType) {
          item.intentSubType = row.intentSubType
        }
        return item
      })
    } catch (error) {
      this.logger.error({ error, tenantId, fromDate, toDate }, 'Failed to get intent distribution')
      throw error
    }
  }

  private toDomainEntity(row: typeof aiDecisions.$inferSelect): AIDecisionEntity {
    return AIDecisionEntity.fromProps({
      id: new EntityId(row.id),
      contextId: row.contextId,
      conversationId: row.conversationId,
      intent: row.intent as any,
      decision: row.decision as any,
      executedActions: row.executedActions as any,
      responseText: row.responseText,
      tokensUsed: row.tokensUsed,
      modelUsed: row.modelUsed,
      processingTime: row.processingTime,
      permissionsDenied: row.permissionsDenied as any,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      version: row.version
    })
  }

  private toPersistence(entity: AIDecisionEntity): typeof aiDecisions.$inferInsert {
    const publicData = entity.toPublic()
    
    return {
      id: entity.id.toString(),
      contextId: publicData.contextId,
      conversationId: publicData.conversationId,
      intent: publicData.intent,
      decision: publicData.decision,
      executedActions: publicData.executedActions,
      responseText: publicData.responseText,
      tokensUsed: publicData.tokensUsed,
      modelUsed: publicData.modelUsed,
      processingTime: publicData.processingTime,
      permissionsDenied: publicData.permissionsDenied,
      createdAt: publicData.createdAt,
      updatedAt: new Date(),
      version: 1
    }
  }
}