import { eq, and, sql, desc, asc } from 'drizzle-orm'
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js'
import * as schema from '../../database/schema'
import type {
  Query,
  QueryExecutor,
  TransactionExecutor,
  UnitOfWork
} from './query-executor'
import {
  FindByIdQuery,
  FindOneQuery,
  FindManyQuery,
  ExistsQuery,
  CountQuery,
  InsertQuery,
  UpdateQuery,
  DeleteQuery
} from './query-executor'

export class DrizzleQueryExecutor implements QueryExecutor {
  constructor(private readonly db: PostgresJsDatabase<any>) {}

  async execute<T = any>(query: Query): Promise<T | null> {
    if (query instanceof FindByIdQuery) {
      return this.executeFindById(query)
    }
    if (query instanceof FindOneQuery) {
      return this.executeFindOne(query)
    }
    throw new Error(`Unsupported query type for execute: ${query.type}`)
  }

  async executeMany<T = any>(query: Query): Promise<T[]> {
    if (query instanceof FindManyQuery) {
      return this.executeFindMany(query)
    }
    throw new Error(`Unsupported query type for executeMany: ${query.type}`)
  }

  async executeCount(query: CountQuery): Promise<number> {
    const table = this.getTable(query.table)
    let queryBuilder: any = this.db.select({ count: sql<number>`count(*)` }).from(table)
    
    if (query.conditions) {
      const conditions = this.buildConditions(table, query.conditions)
      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions))
      }
    }
    
    const result = await queryBuilder
    return result[0]?.count ?? 0
  }

  async executeExists(query: ExistsQuery): Promise<boolean> {
    const table = this.getTable(query.table)
    const conditions = this.buildConditions(table, query.conditions)
    
    const result = await this.db
      .select({ exists: sql<boolean>`1` })
      .from(table)
      .where(and(...conditions))
      .limit(1)
    
    return result.length > 0
  }

  async executeInsert<T = any>(query: InsertQuery): Promise<T> {
    const table = this.getTable(query.table)
    const [result] = await this.db.insert(table).values(query.data).returning()
    return result
  }

  async executeUpdate<T = any>(query: UpdateQuery): Promise<T | null> {
    const table = this.getTable(query.table)
    const conditions = this.buildConditions(table, query.conditions)
    
    const [result] = await this.db
      .update(table)
      .set(query.data)
      .where(and(...conditions))
      .returning()
    
    return result || null
  }

  async executeDelete(query: DeleteQuery): Promise<void> {
    const table = this.getTable(query.table)
    const conditions = this.buildConditions(table, query.conditions)
    
    await this.db.delete(table).where(and(...conditions))
  }

  private async executeFindById<T>(query: FindByIdQuery): Promise<T | null> {
    const table = this.getTable(query.table)
    const [result] = await this.db
      .select()
      .from(table)
      .where(eq(table.id, query.id))
      .limit(1)
    
    return result || null
  }

  private async executeFindOne<T>(query: FindOneQuery): Promise<T | null> {
    const table = this.getTable(query.table)
    const conditions = this.buildConditions(table, query.conditions)
    
    const [result] = await this.db
      .select()
      .from(table)
      .where(and(...conditions))
      .limit(1)
    
    return result || null
  }

  private async executeFindMany<T>(query: FindManyQuery): Promise<T[]> {
    const table = this.getTable(query.table)
    let queryBuilder: any = this.db.select().from(table)
    
    if (query.conditions) {
      const conditions = this.buildConditions(table, query.conditions)
      if (conditions.length > 0) {
        queryBuilder = queryBuilder.where(and(...conditions))
      }
    }
    
    if (query.options?.orderBy) {
      const { field, direction } = query.options.orderBy
      // Convert camelCase to snake_case
      const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase()
      
      if (!table[snakeField]) {
        throw new Error(`Field '${snakeField}' does not exist on table for ordering. Available fields: ${Object.keys(table).join(', ')}`)
      }
      
      const orderFn = direction === 'desc' ? desc : asc
      queryBuilder = queryBuilder.orderBy(orderFn(table[snakeField]))
    }
    
    if (query.options?.limit) {
      queryBuilder = queryBuilder.limit(query.options.limit)
    }
    
    if (query.options?.offset) {
      queryBuilder = queryBuilder.offset(query.options.offset)
    }
    
    return queryBuilder
  }

  private getTable(tableName: string): any {
    // Map table names to actual Drizzle table objects
    const tableMap: Record<string, any> = {
      // Core tables
      users: schema.users,
      tenants: schema.tenants,
      tenantMembers: schema.tenantMembers,
      
      // Conversation tables
      userChannels: schema.userChannels,
      conversations: schema.conversations,
      conversationMessages: schema.conversationMessages,
      conversationFiles: schema.conversationFiles,
      
      // File tables
      files: schema.files,
      fileVersions: schema.fileVersions,
      
      // Integration tables
      integrations: schema.integrations,
      integrationSyncLogs: schema.integrationSyncLogs,
      syncJobs: schema.syncJobs,
      
      // Financial tables
      transactions: schema.transactions,
      transactionLineItems: schema.transactionLineItems,
      suppliers: schema.suppliers,
      invoices: schema.invoices,
      accounts: schema.accounts,
      bankStatements: schema.bankStatements,
      reconciliations: schema.reconciliations,
      manualJournals: schema.manualJournals,
      importBatches: schema.importBatches
    }
    
    const table = tableMap[tableName]
    if (!table) {
      throw new Error(`Unknown table: ${tableName}. Available tables: ${Object.keys(tableMap).join(', ')}`)
    }
    
    return table
  }

  private buildConditions(table: any, conditions: Record<string, any>): any[] {
    const conditionArray: any[] = []
    
    for (const [field, value] of Object.entries(conditions)) {
      // Convert camelCase to snake_case
      const snakeField = field.replace(/([A-Z])/g, '_$1').toLowerCase()
      
      // Check if the field exists on the table
      if (!table[snakeField]) {
        throw new Error(`Field '${snakeField}' does not exist on table. Available fields: ${Object.keys(table).join(', ')}`)
      }
      
      if (value === null) {
        conditionArray.push(sql`${table[snakeField]} IS NULL`)
      } else {
        conditionArray.push(eq(table[snakeField], value))
      }
    }
    
    return conditionArray
  }
}

// Drizzle Transaction Executor
export class DrizzleTransactionExecutor extends DrizzleQueryExecutor implements TransactionExecutor {
  constructor(tx: any) {
    super(tx)
  }

  async beginTransaction(): Promise<void> {
    // Transaction already started by Drizzle
  }

  async commit(): Promise<void> {
    // Handled by Drizzle transaction wrapper
  }

  async rollback(): Promise<void> {
    // Handled by Drizzle transaction wrapper
    throw new Error('Manual rollback')
  }
}

// Drizzle Unit of Work
export class DrizzleUnitOfWork implements UnitOfWork {
  private executor: TransactionExecutor | null = null

  constructor(private readonly db: PostgresJsDatabase<any>) {}

  async begin(): Promise<void> {
    // Drizzle will handle the actual transaction when we use db.transaction()
  }

  async commit(): Promise<void> {
    // Handled by Drizzle transaction wrapper
  }

  async rollback(): Promise<void> {
    // Handled by Drizzle transaction wrapper
    throw new Error('Manual rollback')
  }

  getExecutor(): TransactionExecutor {
    if (!this.executor) {
      throw new Error('Transaction not started. Call begin() first.')
    }
    return this.executor
  }

  // Helper method to run a function within a transaction
  async run<T>(fn: (executor: TransactionExecutor) => Promise<T>): Promise<T> {
    return this.db.transaction(async (tx) => {
      this.executor = new DrizzleTransactionExecutor(tx)
      return fn(this.executor)
    })
  }
}