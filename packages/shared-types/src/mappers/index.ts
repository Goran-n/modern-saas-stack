/**
 * Type mappers for converting between different representations
 */

import {
  UserId, TenantId, IntegrationId, ConversationId, MessageId,
  InvoiceId, SupplierId, AccountId, FileId, SyncJobId, UserChannelId
} from '../branded-types'
import type {
  UserDTO, TenantDTO, IntegrationDTO, ConversationDTO,
  ConversationMessageDTO, InvoiceDTO, SupplierDTO, AccountDTO,
  FileDTO, SyncJobDTO, ErrorDTO, ApiResponseDTO, UserChannelDTO
} from '../api/dtos'

// ID Mappers
export const toUserId = (id: string): UserId => UserId(id)
export const toUserChannelId = (id: string): UserChannelId => UserChannelId(id)
export const toTenantId = (id: string): TenantId => TenantId(id)
export const toIntegrationId = (id: string): IntegrationId => IntegrationId(id)
export const toConversationId = (id: string): ConversationId => ConversationId(id)
export const toMessageId = (id: string): MessageId => MessageId(id)
export const toInvoiceId = (id: string): InvoiceId => InvoiceId(id)
export const toSupplierId = (id: string): SupplierId => SupplierId(id)
export const toAccountId = (id: string): AccountId => AccountId(id)
export const toFileId = (id: string): FileId => FileId(id)
export const toSyncJobId = (id: string): SyncJobId => SyncJobId(id)

// Date mappers
export const toISOString = (date: Date | null | undefined): string | undefined => {
  return date ? date.toISOString() : undefined
}

export const fromISOString = (dateString: string | null | undefined): Date | undefined => {
  return dateString ? new Date(dateString) : undefined
}

// Error mapper
export class ErrorMapper {
  static toDTO(error: Error | any): ErrorDTO {
    if (error instanceof Error) {
      return {
        code: error.name || 'UNKNOWN_ERROR',
        message: error.message,
        details: {},
        timestamp: new Date().toISOString()
      }
    }
    
    return {
      code: 'UNKNOWN_ERROR',
      message: String(error),
      timestamp: new Date().toISOString()
    }
  }
}

// API Response mapper
export class ApiResponseMapper {
  static success<T>(data: T): ApiResponseDTO<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    }
  }
  
  static error(error: Error | any): ApiResponseDTO {
    return {
      success: false,
      error: ErrorMapper.toDTO(error),
      timestamp: new Date().toISOString()
    }
  }
}

// Entity to DTO mappers
export class EntityToDTOMapper {
  static user(entity: any): UserDTO {
    return {
      id: toUserId(entity.id.toString()),
      email: entity.email,
      phone: entity.phone,
      firstName: entity.firstName,
      lastName: entity.lastName,
      avatarUrl: entity.avatarUrl,
      status: entity.status,
      preferences: entity.preferences,
      createdAt: toISOString(entity.createdAt)!,
      updatedAt: toISOString(entity.updatedAt)!
    }
  }
  
  static tenant(entity: any): TenantDTO {
    return {
      id: toTenantId(entity.id.toString()),
      name: entity.name,
      slug: entity.slug,
      email: entity.email,
      status: entity.status,
      plan: entity.plan || 'trial',
      settings: entity.settings,
      metadata: entity.metadata,
      createdAt: toISOString(entity.createdAt)!,
      updatedAt: toISOString(entity.updatedAt)!
    }
  }
  
  static integration(entity: any): IntegrationDTO {
    return {
      id: toIntegrationId(entity.id.toString()),
      tenantId: toTenantId(entity.tenantId.toString()),
      provider: entity.provider,
      integrationType: entity.integrationType,
      name: entity.name,
      status: entity.status,
      settings: entity.settings || undefined,
      lastSyncAt: entity.lastSyncAt ? toISOString(entity.lastSyncAt) : undefined,
      errorCount: entity.errorCount || 0,
      lastError: entity.lastError || undefined,
      createdAt: toISOString(entity.createdAt)!,
      updatedAt: toISOString(entity.updatedAt)!
    }
  }
  
  static conversation(entity: any): ConversationDTO {
    return {
      id: toConversationId(entity.id.toString()),
      channelId: entity.channelId,
      externalThreadId: entity.externalThreadId || undefined,
      status: entity.status,
      metadata: entity.metadata || undefined,
      messageCount: entity.messageCount || 0,
      lastMessageAt: entity.lastMessageAt ? toISOString(entity.lastMessageAt) : undefined,
      createdAt: toISOString(entity.createdAt)!,
      updatedAt: toISOString(entity.updatedAt)!
    }
  }
  
  static message(entity: any): ConversationMessageDTO {
    return {
      id: toMessageId(entity.id.toString()),
      conversationId: toConversationId(entity.conversationId.toString()),
      externalMessageId: entity.externalMessageId,
      direction: entity.direction,
      messageType: entity.messageType,
      content: entity.content,
      metadata: entity.metadata,
      status: entity.status,
      createdAt: toISOString(entity.createdAt)!,
      updatedAt: toISOString(entity.updatedAt)!
    }
  }
  
  static invoice(entity: any): InvoiceDTO {
    return {
      id: toInvoiceId(entity.id.toString()),
      tenantId: toTenantId(entity.tenantId.toString()),
      supplierId: entity.supplierId ? toSupplierId(entity.supplierId.toString()) : undefined,
      invoiceNumber: entity.invoiceNumber || undefined,
      invoiceType: entity.invoiceType,
      status: entity.status,
      invoiceDate: entity.invoiceDate ? toISOString(entity.invoiceDate) : undefined,
      dueDate: entity.dueDate ? toISOString(entity.dueDate) : undefined,
      totalAmount: entity.totalAmount.toString(),
      currency: entity.currency,
      createdAt: toISOString(entity.createdAt)!,
      updatedAt: toISOString(entity.updatedAt)!
    }
  }
  
  static supplier(entity: any): SupplierDTO {
    return {
      id: toSupplierId(entity.id.toString()),
      tenantId: toTenantId(entity.tenantId.toString()),
      name: entity.name,
      displayName: entity.displayName,
      email: entity.primaryEmail,
      phone: entity.primaryPhone,
      taxNumber: entity.taxNumber,
      createdAt: toISOString(entity.createdAt)!,
      updatedAt: toISOString(entity.updatedAt)!
    }
  }
  
  static account(entity: any): AccountDTO {
    const result: AccountDTO = {
      id: toAccountId(entity.id.toString()),
      tenantId: toTenantId(entity.tenantId.toString()),
      code: entity.code,
      name: entity.name,
      accountType: entity.accountType,
      isActive: entity.isActive,
      createdAt: toISOString(entity.createdAt)!,
      updatedAt: toISOString(entity.updatedAt)!
    }
    
    if (entity.description) {
      result.description = entity.description
    }
    
    if (entity.parentAccountId) {
      result.parentAccountId = toAccountId(entity.parentAccountId.toString())
    }
    
    if (entity.balance) {
      result.balance = entity.balance.toString()
    }
    
    if (entity.currencyCode) {
      result.currency = entity.currencyCode
    }
    
    return result
  }
  
  static file(entity: any): FileDTO {
    return {
      id: toFileId(entity.id.toString()),
      filename: entity.filename,
      originalName: entity.originalName,
      mimeType: entity.mimeType,
      size: entity.size,
      url: entity.url,
      metadata: entity.metadata,
      createdAt: toISOString(entity.createdAt)!,
      updatedAt: toISOString(entity.updatedAt)!
    }
  }
  
  static syncJob(entity: any): SyncJobDTO {
    return {
      id: toSyncJobId(entity.id.toString()),
      integrationId: toIntegrationId(entity.integrationId.toString()),
      tenantId: toTenantId(entity.tenantId.toString()),
      type: entity.type,
      status: entity.status,
      progress: entity.progress,
      startedAt: entity.startedAt ? toISOString(entity.startedAt) : undefined,
      completedAt: entity.completedAt ? toISOString(entity.completedAt) : undefined,
      result: entity.result,
      error: entity.error,
      createdAt: toISOString(entity.createdAt)!,
      updatedAt: toISOString(entity.updatedAt)!
    }
  }
  
  static userChannel(entity: any): UserChannelDTO {
    return {
      id: toUserChannelId(entity.id.toString()),
      userId: toUserId(entity.userId.toString()),
      channelType: entity.channelType,
      channelIdentifier: entity.channelIdentifier,
      channelName: entity.channelName,
      status: entity.status,
      isVerified: entity.isVerified,
      settings: entity.settings || {},
      lastActiveAt: entity.lastActiveAt ? toISOString(entity.lastActiveAt) : undefined,
      createdAt: toISOString(entity.createdAt)!,
      updatedAt: toISOString(entity.updatedAt)!
    }
  }
}

// DTO to Entity mappers (for request processing)
export class DTOToEntityMapper {
  static extractUserId(dto: { id: UserId }): string {
    return dto.id as string
  }
  
  static extractTenantId(dto: { id: TenantId }): string {
    return dto.id as string
  }
  
  static extractIntegrationId(dto: { id: IntegrationId }): string {
    return dto.id as string
  }
  
  static extractConversationId(dto: { id: ConversationId }): string {
    return dto.id as string
  }
  
  static extractMessageId(dto: { id: MessageId }): string {
    return dto.id as string
  }
  
  static extractInvoiceId(dto: { id: InvoiceId }): string {
    return dto.id as string
  }
  
  static extractSupplierId(dto: { id: SupplierId }): string {
    return dto.id as string
  }
  
  static extractAccountId(dto: { id: AccountId }): string {
    return dto.id as string
  }
  
  static extractFileId(dto: { id: FileId }): string {
    return dto.id as string
  }
  
  static extractSyncJobId(dto: { id: SyncJobId }): string {
    return dto.id as string
  }
}