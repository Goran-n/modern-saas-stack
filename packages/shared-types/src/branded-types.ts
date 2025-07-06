/**
 * Branded types for type-safe IDs across the application
 * These types ensure that IDs cannot be accidentally mixed up
 */

// Brand type helper
type Brand<T, B> = T & { __brand: B }

// User-related IDs
export type UserId = Brand<string, 'UserId'>
export type UserChannelId = Brand<string, 'UserChannelId'>

// Tenant-related IDs
export type TenantId = Brand<string, 'TenantId'>
export type TenantMemberId = Brand<string, 'TenantMemberId'>

// Integration-related IDs
export type IntegrationId = Brand<string, 'IntegrationId'>
export type SyncJobId = Brand<string, 'SyncJobId'>

// Conversation-related IDs
export type ConversationId = Brand<string, 'ConversationId'>
export type MessageId = Brand<string, 'MessageId'>
export type ConversationFileId = Brand<string, 'ConversationFileId'>

// Financial-related IDs
export type TransactionId = Brand<string, 'TransactionId'>
export type InvoiceId = Brand<string, 'InvoiceId'>
export type SupplierId = Brand<string, 'SupplierId'>
export type AccountId = Brand<string, 'AccountId'>

// File-related IDs
export type FileId = Brand<string, 'FileId'>
export type FileVersionId = Brand<string, 'FileVersionId'>

// UUID validation helper
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const validateId = (id: string, typeName: string): string => {
  if (typeof id !== 'string') {
    throw new Error(`${typeName} must be a string`)
  }
  if (!id.trim()) {
    throw new Error(`${typeName} cannot be empty`)
  }
  if (!UUID_REGEX.test(id)) {
    throw new Error(`${typeName} must be a valid UUID`)
  }
  return id
}

// Helper functions to create branded types with validation
export const UserId = (id: string): UserId => validateId(id, 'UserId') as UserId
export const UserChannelId = (id: string): UserChannelId => validateId(id, 'UserChannelId') as UserChannelId
export const TenantId = (id: string): TenantId => validateId(id, 'TenantId') as TenantId
export const TenantMemberId = (id: string): TenantMemberId => validateId(id, 'TenantMemberId') as TenantMemberId
export const IntegrationId = (id: string): IntegrationId => validateId(id, 'IntegrationId') as IntegrationId
export const SyncJobId = (id: string): SyncJobId => validateId(id, 'SyncJobId') as SyncJobId
export const ConversationId = (id: string): ConversationId => validateId(id, 'ConversationId') as ConversationId
export const MessageId = (id: string): MessageId => validateId(id, 'MessageId') as MessageId
export const ConversationFileId = (id: string): ConversationFileId => validateId(id, 'ConversationFileId') as ConversationFileId
export const TransactionId = (id: string): TransactionId => validateId(id, 'TransactionId') as TransactionId
export const InvoiceId = (id: string): InvoiceId => validateId(id, 'InvoiceId') as InvoiceId
export const SupplierId = (id: string): SupplierId => validateId(id, 'SupplierId') as SupplierId
export const AccountId = (id: string): AccountId => validateId(id, 'AccountId') as AccountId
export const FileId = (id: string): FileId => validateId(id, 'FileId') as FileId
export const FileVersionId = (id: string): FileVersionId => validateId(id, 'FileVersionId') as FileVersionId

// Safe constructors that return undefined for invalid input
export const safeUserId = (id: string): UserId | undefined => {
  try { return UserId(id) } catch { return undefined }
}
export const safeTenantId = (id: string): TenantId | undefined => {
  try { return TenantId(id) } catch { return undefined }
}
export const safeIntegrationId = (id: string): IntegrationId | undefined => {
  try { return IntegrationId(id) } catch { return undefined }
}

// Type guards that actually validate UUIDs
const isValidUUID = (id: string): boolean => {
  return typeof id === 'string' && UUID_REGEX.test(id)
}

export const isUserId = (id: string | UserId): id is UserId => isValidUUID(id)
export const isTenantId = (id: string | TenantId): id is TenantId => isValidUUID(id)
export const isIntegrationId = (id: string | IntegrationId): id is IntegrationId => isValidUUID(id)
export const isConversationId = (id: string | ConversationId): id is ConversationId => isValidUUID(id)
export const isMessageId = (id: string | MessageId): id is MessageId => isValidUUID(id)
export const isTransactionId = (id: string | TransactionId): id is TransactionId => isValidUUID(id)
export const isInvoiceId = (id: string | InvoiceId): id is InvoiceId => isValidUUID(id)
export const isSupplierId = (id: string | SupplierId): id is SupplierId => isValidUUID(id)
export const isAccountId = (id: string | AccountId): id is AccountId => isValidUUID(id)
export const isFileId = (id: string | FileId): id is FileId => isValidUUID(id)

// Utility to extract raw string from branded type
export const extractId = <T extends string>(brandedId: Brand<T, any>): T => brandedId