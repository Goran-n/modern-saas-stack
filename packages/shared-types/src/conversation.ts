/**
 * Conversation-specific types
 * Note: Common enums have been moved to enums.ts
 */

import { 
  ChannelType, ChannelStatus, ConversationStatus, 
  MessageDirection, MessageType 
} from './enums'
import { 
  UserChannelId, ConversationId, MessageId, 
  ConversationFileId, FileId 
} from './branded-types'

export interface ChannelSettings {
  autoDownloadMedia?: boolean
  notificationEnabled?: boolean
  allowedMediaTypes?: string[]
  maxFileSizeMb?: number
}

export interface PublicUserChannel {
  id: UserChannelId
  channelType: ChannelType
  channelIdentifier: string
  channelName?: string | null
  status: ChannelStatus
  isVerified: boolean
  settings: ChannelSettings
  lastActiveAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface PublicConversation {
  id: ConversationId
  channelId: UserChannelId
  externalThreadId?: string | null
  status: ConversationStatus
  metadata: Record<string, any>
  messageCount: number
  lastMessageAt?: Date | null
  createdAt: Date
  updatedAt: Date
}

export interface MessageMetadata {
  deliveryStatus?: string
  readReceipts?: boolean
  errorMessage?: string
  mediaCount?: number
  [key: string]: any
}

export interface PublicConversationMessage {
  id: MessageId
  conversationId: ConversationId
  externalMessageId?: string | null
  direction: MessageDirection
  messageType: MessageType
  content?: string | null
  metadata: MessageMetadata
  createdAt: Date
}

export interface PublicConversationFile {
  id: ConversationFileId
  messageId: MessageId
  fileId: FileId
  originalName?: string | null
  createdAt: Date
}