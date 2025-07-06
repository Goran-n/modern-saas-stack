import { AccountEntity } from '../../core/domain/account/account.entity'
import { EntityId } from '../../core/domain/shared/value-objects/entity-id'
import { Money } from '../../core/domain/shared/value-objects/money'
import type { AccountDatabaseRow } from '../persistence/types/account.types'

export class AccountMapper {
  static toDomain(row: AccountDatabaseRow): AccountEntity {
    return AccountEntity.fromDatabase({
      id: EntityId.from(row.id),
      tenantId: row.tenant_id,
      
      // Account identification
      code: row.code,
      name: row.name,
      displayName: row.display_name,
      description: row.description,
      
      // Classification
      accountType: row.account_type as any,
      accountSubtype: row.account_subtype as any,
      accountClass: row.account_class,
      
      // Hierarchy
      parentAccountId: row.parent_account_id,
      hierarchyLevel: row.hierarchy_level,
      hierarchyPath: row.hierarchy_path,
      isParent: row.is_parent,
      
      // Tax configuration
      defaultTaxCode: row.default_tax_code,
      taxType: row.tax_type as any,
      taxLocked: row.tax_locked,
      
      // Properties
      isActive: row.is_active,
      isSystemAccount: row.is_system_account,
      isBankAccount: row.is_bank_account,
      bankAccountType: row.bank_account_type as any,
      currencyCode: row.currency_code,
      
      // Xero-specific
      enablePaymentsToAccount: row.enable_payments_to_account,
      showInExpenseClaims: row.show_in_expense_claims,
      addToWatchlist: row.add_to_watchlist,
      
      // Reporting
      reportingCode: row.reporting_code,
      reportingCategory: row.reporting_category,
      excludeFromReports: row.exclude_from_reports,
      
      // AI categorization
      categoryKeywords: row.category_keywords || [],
      typicalVendors: row.typical_vendors || [],
      spendingPatterns: row.spending_patterns || {},
      
      // Usage tracking
      transactionCount: row.transaction_count,
      lastUsedDate: row.last_used_date,
      totalDebits: row.total_debits && row.currency_code 
        ? new Money(row.total_debits, row.currency_code)
        : null,
      totalCredits: row.total_credits && row.currency_code
        ? new Money(row.total_credits, row.currency_code)
        : null,
      
      // Budget
      budgetTracking: row.budget_tracking,
      budgetOwner: row.budget_owner,
      
      // Metadata
      customFields: row.custom_fields || {},
      notes: row.notes,
      metadata: row.metadata || {},
      
      // Audit
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by,
      lastSyncedAt: row.last_synced_at,
    })
  }

  static toDatabase(entity: AccountEntity): AccountDatabaseRow {
    const props = entity.toDatabase()
    
    return {
      id: props.id.toString(),
      tenant_id: props.tenantId,
      
      // Account identification
      code: props.code,
      name: props.name,
      display_name: props.displayName,
      description: props.description,
      
      // Classification
      account_type: props.accountType,
      account_subtype: props.accountSubtype,
      account_class: props.accountClass,
      
      // Hierarchy
      parent_account_id: props.parentAccountId,
      hierarchy_level: props.hierarchyLevel,
      hierarchy_path: props.hierarchyPath,
      is_parent: props.isParent,
      
      // Tax configuration
      default_tax_code: props.defaultTaxCode,
      tax_type: props.taxType,
      tax_locked: props.taxLocked,
      
      // Properties
      is_active: props.isActive,
      is_system_account: props.isSystemAccount,
      is_bank_account: props.isBankAccount,
      bank_account_type: props.bankAccountType,
      currency_code: props.currencyCode,
      
      // Xero-specific
      enable_payments_to_account: props.enablePaymentsToAccount,
      show_in_expense_claims: props.showInExpenseClaims,
      add_to_watchlist: props.addToWatchlist,
      
      // Reporting
      reporting_code: props.reportingCode,
      reporting_category: props.reportingCategory,
      exclude_from_reports: props.excludeFromReports,
      
      // AI categorization
      category_keywords: JSON.stringify(props.categoryKeywords),
      typical_vendors: JSON.stringify(props.typicalVendors),
      spending_patterns: JSON.stringify(props.spendingPatterns),
      
      // Usage tracking
      transaction_count: props.transactionCount,
      last_used_date: props.lastUsedDate,
      total_debits: props.totalDebits?.toString() || null,
      total_credits: props.totalCredits?.toString() || null,
      
      // Budget
      budget_tracking: props.budgetTracking,
      budget_owner: props.budgetOwner,
      
      // Metadata
      custom_fields: JSON.stringify(props.customFields),
      notes: props.notes,
      metadata: JSON.stringify(props.metadata),
      
      // Audit
      created_at: props.createdAt,
      updated_at: props.updatedAt,
      created_by: props.createdBy,
      last_synced_at: props.lastSyncedAt,
    }
  }
}