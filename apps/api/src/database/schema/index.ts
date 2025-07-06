// Direct table exports for drizzle (avoid wildcard exports to prevent circular deps)
import { tenants } from './tenants'
import { tenantMembers } from './tenant-members'
import { users } from './users'
import { integrations, integrationSyncLogs } from './integrations'
import { syncJobs } from './sync-jobs'
import { transactions, transactionLineItems } from './transactions'
import { suppliers } from './suppliers'
import { invoices } from './invoices'
import { accounts } from './accounts'
import { bankStatements } from './bank-statements'
import { reconciliations } from './reconciliations'
import { manualJournals } from './manual-journals'
import { importBatches } from './import-batches'
import { files, fileVersions } from './files'
import { userChannels, conversations, conversationMessages, conversationFiles } from './conversations'
import {
  orchestrationContexts,
  aiDecisions,
  promptTemplates,
  aiFunctions,
  conversationSummaries,
} from './orchestration'

// Export individual tables
export {
  tenants,
  tenantMembers,
  users,
  integrations,
  integrationSyncLogs,
  syncJobs,
  transactions,
  transactionLineItems,
  suppliers,
  invoices,
  accounts,
  bankStatements,
  reconciliations,
  manualJournals,
  importBatches,
  files,
  fileVersions,
  userChannels,
  conversations,
  conversationMessages,
  conversationFiles,
  orchestrationContexts,
  aiDecisions,
  promptTemplates,
  aiFunctions,
  conversationSummaries
}

// Export type definitions
export type { Tenant, TenantSettings, TenantSubscription, TenantMetadata } from './tenants'
export type {
  TenantMember,
  MemberPermissions,
  RoleType
} from './tenant-members'
export type { User, NewUser } from './users'
export type { Integration, IntegrationSyncLog, ProviderType } from './integrations'
export type { SyncJob, NewSyncJob } from './sync-jobs'
export type {
  Transaction,
  NewTransaction,
  TransactionLineItem,
  NewTransactionLineItem,
  TransactionWithLineItems,
  UnreconciledTransaction,
  ReconciledTransaction
} from './transactions'
export type { Supplier, NewSupplier } from './suppliers'
export type { Invoice, NewInvoice } from './invoices'
export type { Account, NewAccount } from './accounts'
export type { BankStatement, NewBankStatement } from './bank-statements'
export type { Reconciliation, NewReconciliation } from './reconciliations'
export type { ManualJournal, NewManualJournal } from './manual-journals'
export type { ImportBatch, NewImportBatch } from './import-batches'
export type { File, NewFile, FileVersion, NewFileVersion } from './files'
export type {
  UserChannelRow,
  NewUserChannelRow,
  ConversationRow,
  NewConversationRow,
  ConversationMessageRow,
  NewConversationMessageRow,
  ConversationFileRow,
  NewConversationFileRow
} from './conversations'
export type {
  OrchestrationContext,
  NewOrchestrationContext,
  AIDecision,
  NewAIDecision,
  PromptTemplate,
  NewPromptTemplate,
  AIFunction,
  NewAIFunction,
  ConversationSummary,
  NewConversationSummary
} from './orchestration'

// Export constants and enums
export { DEFAULT_ROLE_PERMISSIONS, ROLE_HIERARCHY, memberStatusEnum, memberRoleEnum } from './tenant-members'
export { PROVIDER_CAPABILITIES } from './integrations'
export { SUPPLIER_TYPE, CONTACT_STATUS, PAYMENT_TERMS_TYPE } from './suppliers'
export { INVOICE_TYPE, INVOICE_SUBTYPE, INVOICE_STATUS, LINE_AMOUNT_TYPES } from './invoices'
export { ACCOUNT_TYPE, ACCOUNT_SUBTYPE, BANK_ACCOUNT_TYPE, TAX_TYPE } from './accounts'
export { IMPORT_SOURCE as BANK_IMPORT_SOURCE, MATCH_STATUS, TRANSACTION_TYPE as BANK_TRANSACTION_TYPE, MATCH_METHOD as BANK_MATCH_METHOD } from './bank-statements'
export { MATCH_TYPE, MATCH_METHOD, CREATED_BY } from './reconciliations'
export { JOURNAL_STATUS } from './manual-journals'
export { BATCH_TYPE, IMPORT_SOURCE, BATCH_STATUS } from './import-batches'
export { intentTypeEnum, intentSubTypeEnum, decisionActionEnum } from './orchestration'

// Schema object for drizzle migrations
export const schema = {
  tenants,
  tenantMembers,
  users,
  integrations,
  integrationSyncLogs,
  syncJobs,
  transactions,
  transactionLineItems,
  suppliers,
  invoices,
  accounts,
  bankStatements,
  reconciliations,
  manualJournals,
  importBatches,
  files,
  fileVersions,
  userChannels,
  conversations,
  conversationMessages,
  conversationFiles,
  orchestrationContexts,
  aiDecisions,
  promptTemplates,
  aiFunctions,
  conversationSummaries,
}
