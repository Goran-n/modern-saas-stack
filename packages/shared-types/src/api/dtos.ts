/**
 * Data Transfer Objects (DTOs) for API communication
 */

import { 
  UserId, TenantId, IntegrationId, ConversationId, MessageId, 
  InvoiceId, SupplierId, AccountId, FileId, SyncJobId, UserChannelId 
} from '../branded-types'
import {
  UserStatus, TenantStatus, TenantPlan, MemberRole,
  IntegrationStatus, SyncJobStatus, ConversationStatus,
  MessageDirection, MessageType, MessageStatus,
  InvoiceStatus, InvoiceType, AccountType,
  ChannelType, ChannelStatus
} from '../enums'

// Base DTOs
export interface BaseDTO {
  id: string
  createdAt: string
  updatedAt: string
}

export interface PaginationDTO {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ErrorDTO {
  code: string
  message: string
  details?: Record<string, any>
  timestamp: string
}

// User DTOs
export interface UserDTO extends BaseDTO {
  id: UserId
  email: string
  phone?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  status: UserStatus
  preferences?: Record<string, any>
}

export interface CreateUserDTO {
  email: string
  phone?: string
  firstName?: string
  lastName?: string
  password?: string
}

export interface UpdateUserDTO {
  email?: string
  phone?: string
  firstName?: string
  lastName?: string
  avatarUrl?: string
  preferences?: Record<string, any>
}

// Tenant DTOs
export interface TenantDTO extends BaseDTO {
  id: TenantId
  name: string
  slug: string
  email: string
  status: TenantStatus
  plan: TenantPlan
  settings?: Record<string, any>
  metadata?: Record<string, any> | undefined
}

export interface CreateTenantDTO {
  name: string
  email: string
  slug?: string
}

export interface UpdateTenantDTO {
  name?: string
  email?: string
  settings?: Record<string, any>
  metadata?: Record<string, any> | undefined
}

export interface TenantMemberDTO extends BaseDTO {
  userId: UserId
  tenantId: TenantId
  role: MemberRole
  permissions?: Record<string, boolean>
  user?: UserDTO
}

// Integration DTOs
export interface IntegrationDTO extends BaseDTO {
  id: IntegrationId
  tenantId: TenantId
  provider: string
  integrationType: string
  name: string
  status: IntegrationStatus
  settings?: Record<string, any> | undefined
  lastSyncAt?: string | undefined
  errorCount: number
  lastError?: string | undefined
}

export interface CreateIntegrationDTO {
  provider: string
  integrationType: string
  name: string
  settings?: Record<string, any>
}

export interface UpdateIntegrationDTO {
  name?: string
  status?: IntegrationStatus
  settings?: Record<string, any>
}

// Sync Job DTOs
export interface SyncJobDTO extends BaseDTO {
  id: SyncJobId
  integrationId: IntegrationId
  tenantId: TenantId
  type: string
  status: SyncJobStatus
  progress: number
  startedAt?: string | undefined
  completedAt?: string | undefined
  result?: {
    imported: number
    updated: number
    skipped: number
    errors: number
  } | undefined
  error?: string | undefined
}

// User Channel DTOs
export interface UserChannelDTO extends BaseDTO {
  id: UserChannelId
  userId: UserId
  channelType: ChannelType
  channelIdentifier: string
  channelName?: string
  status: ChannelStatus
  isVerified: boolean
  settings: Record<string, any>
  lastActiveAt?: string | undefined
}

// Conversation DTOs
export interface ConversationDTO extends BaseDTO {
  id: ConversationId
  channelId: string
  externalThreadId?: string | undefined
  status: ConversationStatus
  metadata?: Record<string, any> | undefined
  messageCount: number
  lastMessageAt?: string | undefined
  participants?: UserDTO[]
}

export interface CreateConversationDTO {
  channelId: string
  externalThreadId?: string | undefined
  metadata?: Record<string, any> | undefined
}

export interface ConversationMessageDTO extends BaseDTO {
  id: MessageId
  conversationId: ConversationId
  externalMessageId?: string | undefined
  direction: MessageDirection
  messageType: MessageType
  content?: string | undefined
  metadata?: Record<string, any> | undefined
  status?: MessageStatus | undefined
  sender?: UserDTO
  files?: FileDTO[]
}

export interface CreateMessageDTO {
  conversationId: ConversationId
  content?: string | undefined
  messageType: MessageType
  files?: FileId[]
  metadata?: Record<string, any> | undefined
}

// Financial DTOs
export interface InvoiceDTO extends BaseDTO {
  id: InvoiceId
  tenantId: TenantId
  supplierId?: SupplierId | undefined
  invoiceNumber?: string | undefined
  invoiceType: InvoiceType
  status: InvoiceStatus
  invoiceDate?: string | undefined
  dueDate?: string | undefined
  totalAmount: string
  currency: string
  lineItems?: InvoiceLineItemDTO[]
  supplier?: SupplierDTO
}

export interface InvoiceLineItemDTO {
  description: string
  quantity: number
  unitPrice: string
  totalAmount: string
  taxAmount?: string
  accountCode?: string
}

export interface SupplierDTO extends BaseDTO {
  id: SupplierId
  tenantId: TenantId
  name: string
  displayName?: string
  email?: string
  phone?: string
  taxNumber?: string
  address?: AddressDTO
  bankAccount?: BankAccountDTO
}

export interface AddressDTO {
  line1: string
  line2?: string
  city: string
  state: string
  postalCode: string
  country: string
}

export interface BankAccountDTO {
  accountName: string
  accountNumber: string
  bankName: string
  routingNumber?: string
}

export interface AccountDTO extends BaseDTO {
  id: AccountId
  tenantId: TenantId
  code: string
  name: string
  accountType: AccountType
  description?: string
  parentAccountId?: AccountId
  isActive: boolean
  balance?: string
  currency?: string
}

// Webhook DTOs
export interface WebhookMessageDTO {
  channelType: ChannelType
  from: string
  to: string
  content?: string | undefined | undefined
  externalMessageId: string
  direction: MessageDirection
  messageType: MessageType
  metadata: Record<string, any>
  mediaUrls: Array<{
    url: string
    contentType: string
  }>
  receivedAt: Date
}

export interface WebhookStatusDTO {
  channelType: ChannelType
  externalMessageId: string
  status: string
  from: string
  to: string
  errorCode?: string | undefined
  errorMessage?: string | undefined
  updatedAt: Date
}

// File DTOs
export interface FileDTO extends BaseDTO {
  id: FileId
  filename: string
  originalName: string
  mimeType: string
  size: number
  url?: string
  metadata?: Record<string, any> | undefined
}

export interface UploadFileDTO {
  filename: string
  mimeType: string
  size: number
  metadata?: Record<string, any> | undefined
}

// Response wrappers
export interface ApiResponseDTO<T = any> {
  success: boolean
  data?: T
  error?: ErrorDTO
  timestamp: string
}

export interface PaginatedResponseDTO<T> {
  data: T[]
  pagination: PaginationDTO
}

export interface BulkOperationResultDTO<T> {
  succeeded: T[]
  failed: Array<{
    item: any
    error: ErrorDTO
  }>
  totalProcessed: number
  successCount: number
  failureCount: number
}