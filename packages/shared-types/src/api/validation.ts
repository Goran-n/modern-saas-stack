/**
 * Zod validation schemas for API endpoints
 */

import { z } from 'zod'
import {
  MemberRole,
  IntegrationStatus, ConversationStatus,
  MessageType, InvoiceType,
  AccountType
} from '../enums'
import { moneyAmountSchema, currencyCodeSchema } from './money-validation'
import { phoneSchema } from './phone-validation'

// Common schemas
export const uuid = z.string().uuid()
export const emailSchema = z.string().email()
export const urlSchema = z.string().url()
export const dateSchema = z.string().datetime()
// Re-export phone validation from dedicated module
export { phoneSchema } from './phone-validation'

// Aliases for better naming  
export const phoneNumber = phoneSchema
export const verificationCode = z.string().length(6)

export const paginationSchema = z.object({
  limit: z.number().int().positive().max(100).default(20),
  offset: z.number().int().min(0).default(0),
})

// User schemas
export const createUserSchema = z.object({
  email: emailSchema,
  phone: phoneSchema.optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  password: z.string().min(8).optional(),
})

export const updateUserSchema = z.object({
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  avatarUrl: urlSchema.optional(),
  preferences: z.record(z.unknown()).optional(),
})

// Tenant schemas
export const createTenantSchema = z.object({
  name: z.string().min(1).max(255),
  email: emailSchema,
  slug: z.string().regex(/^[a-z0-9-]+$/).min(3).max(50).optional(),
})

export const updateTenantSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  email: emailSchema.optional(),
  settings: z.record(z.unknown()).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const inviteMemberSchema = z.object({
  email: emailSchema,
  role: z.nativeEnum(MemberRole),
  permissions: z.record(z.boolean()).optional(),
})

// Integration schemas
export const createIntegrationSchema = z.object({
  provider: z.string().min(1),
  integrationType: z.string().min(1),
  name: z.string().min(1).max(255),
  settings: z.record(z.unknown()).optional(),
})

export const updateIntegrationSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  status: z.nativeEnum(IntegrationStatus).optional(),
  settings: z.record(z.unknown()).optional(),
})

export const triggerSyncSchema = z.object({
  integrationId: uuid,
  syncType: z.enum(['full', 'incremental']).default('incremental'),
})

// Conversation schemas
export const createConversationSchema = z.object({
  channelId: uuid,
  externalThreadId: z.string().optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const createMessageSchema = z.object({
  conversationId: uuid,
  content: z.string().optional(),
  messageType: z.nativeEnum(MessageType),
  files: z.array(uuid).optional(),
  metadata: z.record(z.unknown()).optional(),
})

export const conversationFiltersSchema = z.object({
  status: z.nativeEnum(ConversationStatus).optional(),
  channelId: uuid.optional(),
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
})

// Financial schemas
export const createInvoiceSchema = z.object({
  supplierId: uuid.optional(),
  invoiceNumber: z.string().optional(),
  invoiceType: z.nativeEnum(InvoiceType),
  invoiceDate: dateSchema.optional(),
  dueDate: dateSchema.optional(),
  totalAmount: moneyAmountSchema,
  currency: currencyCodeSchema,
  lineItems: z.array(z.object({
    description: z.string(),
    quantity: z.number().positive(),
    unitPrice: moneyAmountSchema,
    totalAmount: moneyAmountSchema,
    taxAmount: moneyAmountSchema.optional(),
    accountCode: z.string().optional(),
  })).optional(),
})

export const createSupplierSchema = z.object({
  name: z.string().min(1).max(255),
  displayName: z.string().min(1).max(255).optional(),
  email: emailSchema.optional(),
  phone: phoneSchema.optional(),
  taxNumber: z.string().optional(),
  address: z.object({
    line1: z.string(),
    line2: z.string().optional(),
    city: z.string(),
    state: z.string(),
    postalCode: z.string(),
    country: z.string().length(2),
  }).optional(),
})

export const createAccountSchema = z.object({
  code: z.string().min(1).max(20),
  name: z.string().min(1).max(255),
  accountType: z.nativeEnum(AccountType),
  description: z.string().optional(),
  parentAccountId: uuid.optional(),
  currency: currencyCodeSchema.optional(),
})

// File schemas
export const uploadFileSchema = z.object({
  filename: z.string().min(1).max(255),
  mimeType: z.string(),
  size: z.number().positive().max(100 * 1024 * 1024), // 100MB max
  metadata: z.record(z.unknown()).optional(),
})

// OAuth schemas
export const oauthCallbackSchema = z.object({
  code: z.string(),
  state: z.string(),
  error: z.string().optional(),
})

export const completeOAuthSchema = z.object({
  provider: z.string(),
  code: z.string(),
  state: z.string(),
  organisationId: z.string().optional(),
})

// Search and filter schemas
export const searchSchema = z.object({
  query: z.string().min(1).max(255),
  filters: z.record(z.unknown()).optional(),
  sort: z.object({
    field: z.string(),
    direction: z.enum(['asc', 'desc']),
  }).optional(),
}).merge(paginationSchema)

// Batch operation schemas
export const batchDeleteSchema = z.object({
  ids: z.array(uuid).min(1).max(100),
})

export const batchUpdateSchema = z.object({
  ids: z.array(uuid).min(1).max(100),
  updates: z.record(z.unknown()),
})

// Export all schemas
export const schemas = {
  // Common
  uuid: uuid,
  email: emailSchema,
  url: urlSchema,
  date: dateSchema,
  phone: phoneSchema,
  phoneNumber: phoneNumber,
  verificationCode: verificationCode,
  pagination: paginationSchema,
  
  // User
  createUser: createUserSchema,
  updateUser: updateUserSchema,
  
  // Tenant
  createTenant: createTenantSchema,
  updateTenant: updateTenantSchema,
  inviteMember: inviteMemberSchema,
  
  // Integration
  createIntegration: createIntegrationSchema,
  updateIntegration: updateIntegrationSchema,
  triggerSync: triggerSyncSchema,
  
  // Conversation
  createConversation: createConversationSchema,
  createMessage: createMessageSchema,
  conversationFilters: conversationFiltersSchema,
  
  // Financial
  createInvoice: createInvoiceSchema,
  createSupplier: createSupplierSchema,
  createAccount: createAccountSchema,
  
  // File
  uploadFile: uploadFileSchema,
  
  // OAuth
  oauthCallback: oauthCallbackSchema,
  completeOAuth: completeOAuthSchema,
  
  // Search and batch
  search: searchSchema,
  batchDelete: batchDeleteSchema,
  batchUpdate: batchUpdateSchema,
}