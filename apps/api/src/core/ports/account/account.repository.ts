import { AccountEntity, AccountType, AccountSubtype } from '../../domain/account/account.entity'
import { EntityId } from '../../domain/shared/value-objects/entity-id'

export interface AccountFilters {
  accountType?: AccountType[]
  accountSubtype?: AccountSubtype[]
  isActive?: boolean
  isBankAccount?: boolean
  isSystemAccount?: boolean
  parentAccountId?: string | null
  hasTransactions?: boolean
  searchText?: string // For searching by name/code
}

export interface AccountSortOptions {
  field: 'code' | 'name' | 'accountType' | 'lastUsedDate' | 'createdAt'
  direction: 'asc' | 'desc'
}

export interface AccountBalanceSummary {
  assets: { count: number; total: number }
  liabilities: { count: number; total: number }
  equity: { count: number; total: number }
  revenue: { count: number; total: number }
  expenses: { count: number; total: number }
}

export interface AccountRepository {
  /**
   * Save an account (create or update)
   */
  save(account: AccountEntity): Promise<AccountEntity>
  
  /**
   * Find an account by ID
   */
  findById(id: EntityId): Promise<AccountEntity | null>
  
  /**
   * Find an account by code
   */
  findByCode(tenantId: string, code: string): Promise<AccountEntity | null>
  
  /**
   * Find accounts by tenant with filters
   */
  findByTenant(
    tenantId: string,
    filters?: AccountFilters,
    sort?: AccountSortOptions,
    limit?: number,
    offset?: number
  ): Promise<AccountEntity[]>
  
  /**
   * Count accounts by tenant with filters
   */
  countByTenant(
    tenantId: string,
    filters?: AccountFilters
  ): Promise<number>
  
  /**
   * Find child accounts of a parent
   */
  findChildren(parentAccountId: string): Promise<AccountEntity[]>
  
  /**
   * Find all descendants of an account (recursive)
   */
  findDescendants(parentAccountId: string): Promise<AccountEntity[]>
  
  /**
   * Find bank accounts for a tenant
   */
  findBankAccounts(
    tenantId: string,
    currency?: string
  ): Promise<AccountEntity[]>
  
  /**
   * Find accounts on watchlist
   */
  findWatchlistAccounts(tenantId: string): Promise<AccountEntity[]>
  
  /**
   * Find accounts suitable for expense claims
   */
  findExpenseClaimAccounts(tenantId: string): Promise<AccountEntity[]>
  
  /**
   * Get account balance summary by type
   */
  getBalanceSummary(
    tenantId: string,
    currency: string
  ): Promise<AccountBalanceSummary>
  
  /**
   * Find accounts with no recent activity
   */
  findInactiveAccounts(
    tenantId: string,
    daysSinceLastUse: number
  ): Promise<AccountEntity[]>
  
  /**
   * Check if an account exists
   */
  exists(id: string): Promise<boolean>
  
  /**
   * Check if an account code exists
   */
  existsByCode(tenantId: string, code: string): Promise<boolean>
  
  /**
   * Delete an account
   */
  delete(id: string): Promise<void>
  
  /**
   * Find accounts by IDs
   */
  findByIds(ids: string[]): Promise<AccountEntity[]>
  
  /**
   * Find system accounts
   */
  findSystemAccounts(tenantId: string): Promise<AccountEntity[]>
  
  /**
   * Update hierarchy information for multiple accounts
   */
  updateHierarchy(
    accountUpdates: Array<{ id: string; parentId: string | null; level: number; path: string }>
  ): Promise<void>
  
  /**
   * Find accounts by keyword (for AI categorization)
   */
  findByKeyword(
    tenantId: string,
    keyword: string
  ): Promise<AccountEntity[]>
  
  /**
   * Find accounts by typical vendor
   */
  findByTypicalVendor(
    tenantId: string,
    vendor: string
  ): Promise<AccountEntity[]>
}