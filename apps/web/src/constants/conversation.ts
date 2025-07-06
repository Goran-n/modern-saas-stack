/**
 * Conversation-related constants
 * Minimal set of constants specific to the frontend
 */

// Re-export types from shared package for convenience
export type { 
  ChannelType, 
  ChannelStatus, 
  ConversationStatus, 
  MessageDirection,
  MessageType 
} from '@kibly/shared-types'

// Environment-specific constants
export const KIBLY_WHATSAPP_NUMBER = import.meta.env.VITE_KIBLY_WHATSAPP_NUMBER || '+1234567890'

// UI-specific constants
export const CONVERSATION_PAGE_SIZE = 20
export const MESSAGE_PAGE_SIZE = 50
export const RESEND_COOLDOWN_SECONDS = 60