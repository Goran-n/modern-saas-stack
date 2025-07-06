import { AccountEntity } from '../../../core/domain/account/account.entity'
import { 
  AccountRepository, 
  AccountFilters, 
  AccountSortOptions,
  AccountBalanceSummary 
} from '../../../core/ports/account/account.repository'
import { EntityId } from '../../../core/domain/shared/value-objects/entity-id'
import { QueryExecutor, FindByIdQuery, FindManyQuery, FindOneQuery, InsertQuery, UpdateQuery, ExistsQuery, CountQuery } from '../../persistence/query-executor'
import { AccountMapper } from '../../mappers/account.mapper'
import type { AccountDatabaseRow } from '../../persistence/types/account.types'

export class DrizzleAccountRepository implements AccountRepository {
  constructor(private readonly queryExecutor: QueryExecutor) {}

  async save(account: AccountEntity): Promise<AccountEntity> {
    const row = AccountMapper.toDatabase(account)
    
    // Check if exists
    const exists = await this.exists(account.id.toString())
    
    if (exists) {
      // Update
      const query = new UpdateQuery('accounts', { id: account.id.toString() }, row)
      const updated = await this.queryExecutor.executeUpdate<AccountDatabaseRow>(query)
      if (!updated) {
        throw new Error(`Failed to update account ${account.id.toString()}`)
      }
      return AccountMapper.toDomain(updated)
    } else {
      // Insert
      const query = new InsertQuery('accounts', row)
      const inserted = await this.queryExecutor.executeInsert<AccountDatabaseRow>(query)
      return AccountMapper.toDomain(inserted)
    }
  }

  async findById(id: EntityId): Promise<AccountEntity | null> {
    const query = new FindByIdQuery('accounts', id.toString())
    const result = await this.queryExecutor.execute<AccountDatabaseRow>(query)
    return result ? AccountMapper.toDomain(result) : null
  }

  async findByCode(tenantId: string, code: string): Promise<AccountEntity | null> {
    const query = new FindOneQuery('accounts', {
      tenant_id: tenantId,
      code: code
    })
    const result = await this.queryExecutor.execute<AccountDatabaseRow>(query)
    return result ? AccountMapper.toDomain(result) : null
  }

  async findByTenant(
    tenantId: string,
    filters?: AccountFilters,
    sort?: AccountSortOptions,
    limit?: number,
    offset?: number
  ): Promise<AccountEntity[]> {
    const conditions: Record<string, any> = { tenant_id: tenantId }
    
    // Apply filters
    if (filters) {
      if (filters.accountType && filters.accountType.length > 0) {
        // For now, handle single type
        conditions.account_type = filters.accountType[0]
      }
      
      if (filters.accountSubtype && filters.accountSubtype.length > 0) {
        conditions.account_subtype = filters.accountSubtype[0]
      }
      
      if (filters.isActive !== undefined) {
        conditions.is_active = filters.isActive
      }
      
      if (filters.isBankAccount !== undefined) {
        conditions.is_bank_account = filters.isBankAccount
      }
      
      if (filters.isSystemAccount !== undefined) {
        conditions.is_system_account = filters.isSystemAccount
      }
      
      if (filters.parentAccountId !== undefined) {
        conditions.parent_account_id = filters.parentAccountId
      }
    }
    
    const options: any = {}
    if (sort) {
      options.orderBy = {
        field: this.mapSortField(sort.field),
        direction: sort.direction
      }
    }
    if (limit !== undefined) options.limit = limit
    if (offset !== undefined) options.offset = offset
    
    const query = new FindManyQuery('accounts', conditions, options)
    const results = await this.queryExecutor.executeMany<AccountDatabaseRow>(query)
    
    // Post-process for additional filters
    let accounts = results.map(row => AccountMapper.toDomain(row))
    
    if (filters?.hasTransactions !== undefined) {
      accounts = accounts.filter(acc => 
        filters.hasTransactions ? acc.toDatabase().transactionCount > 0 : acc.toDatabase().transactionCount === 0
      )
    }
    
    if (filters?.searchText) {
      const searchLower = filters.searchText.toLowerCase()
      accounts = accounts.filter(acc => 
        acc.name.toLowerCase().includes(searchLower) ||
        acc.code.toLowerCase().includes(searchLower)
      )
    }
    
    return accounts
  }

  async countByTenant(tenantId: string, filters?: AccountFilters): Promise<number> {
    const conditions: Record<string, any> = { tenant_id: tenantId }
    
    // Apply same filters as findByTenant
    if (filters) {
      if (filters.accountType && filters.accountType.length > 0) {
        conditions.account_type = filters.accountType[0]
      }
      
      if (filters.accountSubtype && filters.accountSubtype.length > 0) {
        conditions.account_subtype = filters.accountSubtype[0]
      }
      
      if (filters.isActive !== undefined) {
        conditions.is_active = filters.isActive
      }
      
      if (filters.isBankAccount !== undefined) {
        conditions.is_bank_account = filters.isBankAccount
      }
      
      if (filters.isSystemAccount !== undefined) {
        conditions.is_system_account = filters.isSystemAccount
      }
      
      if (filters.parentAccountId !== undefined) {
        conditions.parent_account_id = filters.parentAccountId
      }
    }
    
    const query = new CountQuery('accounts', conditions)
    return this.queryExecutor.executeCount(query)
  }

  async findChildren(parentAccountId: string): Promise<AccountEntity[]> {
    const query = new FindManyQuery('accounts', {
      parent_account_id: parentAccountId
    }, {
      orderBy: { field: 'code', direction: 'asc' }
    })
    const results = await this.queryExecutor.executeMany<AccountDatabaseRow>(query)
    return results.map(row => AccountMapper.toDomain(row))
  }

  async findDescendants(parentAccountId: string): Promise<AccountEntity[]> {
    // Would need recursive CTE or hierarchy path LIKE query
    // For now, implement simple one-level children
    const children = await this.findChildren(parentAccountId)
    const descendants = [...children]
    
    // Recursively find children of children
    for (const child of children) {
      const grandChildren = await this.findDescendants(child.id.toString())
      descendants.push(...grandChildren)
    }
    
    return descendants
  }

  async findBankAccounts(tenantId: string, currency?: string): Promise<AccountEntity[]> {
    const conditions: Record<string, any> = {
      tenant_id: tenantId,
      is_bank_account: true,
      is_active: true
    }
    
    if (currency) {
      conditions.currency_code = currency
    }
    
    const query = new FindManyQuery('accounts', conditions, {
      orderBy: { field: 'name', direction: 'asc' }
    })
    const results = await this.queryExecutor.executeMany<AccountDatabaseRow>(query)
    return results.map(row => AccountMapper.toDomain(row))
  }

  async findWatchlistAccounts(tenantId: string): Promise<AccountEntity[]> {
    const query = new FindManyQuery('accounts', {
      tenant_id: tenantId,
      add_to_watchlist: true,
      is_active: true
    }, {
      orderBy: { field: 'name', direction: 'asc' }
    })
    const results = await this.queryExecutor.executeMany<AccountDatabaseRow>(query)
    return results.map(row => AccountMapper.toDomain(row))
  }

  async findExpenseClaimAccounts(tenantId: string): Promise<AccountEntity[]> {
    const query = new FindManyQuery('accounts', {
      tenant_id: tenantId,
      show_in_expense_claims: true,
      is_active: true
    }, {
      orderBy: { field: 'code', direction: 'asc' }
    })
    const results = await this.queryExecutor.executeMany<AccountDatabaseRow>(query)
    return results.map(row => AccountMapper.toDomain(row))
  }

  async getBalanceSummary(
    tenantId: string,
    currency: string
  ): Promise<AccountBalanceSummary> {
    // Would require GROUP BY account_type
    // For now, fetch all and aggregate
    const allAccounts = await this.findByTenant(tenantId)
    
    // const types: AccountType[] = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE']
    const summary: AccountBalanceSummary = {
      assets: { count: 0, total: 0 },
      liabilities: { count: 0, total: 0 },
      equity: { count: 0, total: 0 },
      revenue: { count: 0, total: 0 },
      expenses: { count: 0, total: 0 }
    }
    
    for (const account of allAccounts) {
      const balance = account.balance
      if (balance && balance.getCurrency() === currency) {
        const key = account.accountType.toLowerCase() + 's' as keyof AccountBalanceSummary
        if (key in summary) {
          summary[key].count++
          summary[key].total += parseFloat(balance.toString())
        }
      }
    }
    
    return summary
  }

  async findInactiveAccounts(
    tenantId: string,
    daysSinceLastUse: number
  ): Promise<AccountEntity[]> {
    // Would need date comparison
    const allAccounts = await this.findByTenant(tenantId, { isActive: true })
    const cutoffDate = new Date()
    cutoffDate.setDate(cutoffDate.getDate() - daysSinceLastUse)
    
    return allAccounts.filter(account => {
      const lastUsed = account.toDatabase().lastUsedDate
      return !lastUsed || lastUsed < cutoffDate
    })
  }

  async exists(id: string): Promise<boolean> {
    const query = new ExistsQuery('accounts', { id })
    return this.queryExecutor.executeExists(query)
  }

  async existsByCode(tenantId: string, code: string): Promise<boolean> {
    const query = new ExistsQuery('accounts', { tenant_id: tenantId, code })
    return this.queryExecutor.executeExists(query)
  }

  async delete(id: string): Promise<void> {
    // Soft delete by deactivating
    const query = new UpdateQuery(
      'accounts',
      { id },
      { is_active: false, updated_at: new Date() }
    )
    await this.queryExecutor.executeUpdate(query)
  }

  async findByIds(ids: string[]): Promise<AccountEntity[]> {
    // Would need IN clause support
    const accounts: AccountEntity[] = []
    for (const id of ids) {
      const account = await this.findById(EntityId.from(id))
      if (account) {
        accounts.push(account)
      }
    }
    return accounts
  }

  async findSystemAccounts(tenantId: string): Promise<AccountEntity[]> {
    const query = new FindManyQuery('accounts', {
      tenant_id: tenantId,
      is_system_account: true
    }, {
      orderBy: { field: 'code', direction: 'asc' }
    })
    const results = await this.queryExecutor.executeMany<AccountDatabaseRow>(query)
    return results.map(row => AccountMapper.toDomain(row))
  }

  async updateHierarchy(
    accountUpdates: Array<{ id: string; parentId: string | null; level: number; path: string }>
  ): Promise<void> {
    // Would need batch update
    for (const update of accountUpdates) {
      const query = new UpdateQuery(
        'accounts',
        { id: update.id },
        {
          parent_account_id: update.parentId,
          hierarchy_level: update.level,
          hierarchy_path: update.path,
          updated_at: new Date()
        }
      )
      await this.queryExecutor.executeUpdate(query)
    }
  }

  async findByKeyword(tenantId: string, keyword: string): Promise<AccountEntity[]> {
    // Would need JSON array contains
    const allAccounts = await this.findByTenant(tenantId)
    return allAccounts.filter(account => {
      const props = account.toDatabase()
      return props.categoryKeywords.includes(keyword)
    })
  }

  async findByTypicalVendor(tenantId: string, vendor: string): Promise<AccountEntity[]> {
    // Would need JSON array contains
    const allAccounts = await this.findByTenant(tenantId)
    return allAccounts.filter(account => {
      const props = account.toDatabase()
      return props.typicalVendors.includes(vendor)
    })
  }

  private mapSortField(field: AccountSortOptions['field']): string {
    const fieldMap: Record<AccountSortOptions['field'], string> = {
      code: 'code',
      name: 'name',
      accountType: 'account_type',
      lastUsedDate: 'last_used_date',
      createdAt: 'created_at'
    }
    return fieldMap[field]
  }
}