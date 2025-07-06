import type { ConversationStatus } from '../../../core/domain/conversation/conversation.entity'
import type { MessageDirection, MessageType } from '../../../core/domain/conversation/conversation-message.entity'
import type { ChannelType, ChannelStatus } from '../../../core/domain/conversation/user-channel.entity'

// Conversation Database Row
export interface ConversationDatabaseRow {
  id: string
  tenant_id: string
  user_id: string
  channel_id: string
  external_thread_id: string | null
  status: ConversationStatus
  metadata: unknown
  message_count: number
  last_message_at: Date | null
  created_at: Date
  updated_at: Date
  version: number
}

// Conversation Message Database Row
export interface ConversationMessageDatabaseRow {
  id: string
  conversation_id: string
  external_message_id: string | null
  direction: MessageDirection
  message_type: MessageType
  content: string | null
  metadata: unknown
  created_at: Date
}

// Conversation File Database Row
export interface ConversationFileDatabaseRow {
  id: string
  message_id: string
  file_id: string
  original_name: string | null
  created_at: Date
}

// User Channel Database Row
export interface UserChannelDatabaseRow {
  id: string
  user_id: string
  tenant_id: string
  channel_type: ChannelType
  channel_identifier: string
  channel_name: string | null
  status: ChannelStatus
  is_verified: boolean
  verification_code: string | null
  verification_expires_at: Date | null
  settings: unknown
  last_active_at: Date | null
  created_at: Date
  updated_at: Date
  version: number
}