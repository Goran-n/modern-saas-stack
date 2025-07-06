import { ref } from 'vue'
import { useToast } from './useToast'
import { useCommunicationStore } from '../stores/communication'
import { ConversationStatus, type PublicConversation } from '@kibly/shared-types'

/**
 * Composable for handling conversation actions
 * Centralizes conversation operations with consistent error handling
 */
export function useConversationActions() {
  const { showToast } = useToast()
  const communicationStore = useCommunicationStore()
  
  // Loading states for different actions
  const isArchiving = ref(false)
  const isReopening = ref(false)
  const isSending = ref(false)

  /**
   * Archive a conversation
   */
  const archiveConversation = async (conversationId: string): Promise<boolean> => {
    isArchiving.value = true
    try {
      await communicationStore.updateConversationStatus(conversationId, ConversationStatus.ARCHIVED)
      showToast({
        title: 'Conversation archived',
        description: 'The conversation has been archived',
        type: 'success'
      })
      return true
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to archive conversation',
        type: 'error'
      })
      return false
    } finally {
      isArchiving.value = false
    }
  }

  /**
   * Reopen an archived conversation
   */
  const reopenConversation = async (conversationId: string): Promise<boolean> => {
    isReopening.value = true
    try {
      await communicationStore.updateConversationStatus(conversationId, ConversationStatus.ACTIVE)
      showToast({
        title: 'Conversation reopened',
        description: 'The conversation has been reopened',
        type: 'success'
      })
      return true
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to reopen conversation',
        type: 'error'
      })
      return false
    } finally {
      isReopening.value = false
    }
  }

  /**
   * Send a message in a conversation
   */
  const sendMessage = async (conversationId: string, content: string): Promise<boolean> => {
    if (!content.trim()) return false
    
    isSending.value = true
    try {
      await communicationStore.sendMessage(conversationId, content)
      return true
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to send message',
        type: 'error'
      })
      return false
    } finally {
      isSending.value = false
    }
  }

  /**
   * Load full conversation details
   */
  const loadConversation = async (conversationId: string): Promise<boolean> => {
    try {
      await communicationStore.fetchConversation(conversationId)
      return true
    } catch (error) {
      showToast({
        title: 'Error',
        description: 'Failed to load conversation',
        type: 'error'
      })
      return false
    }
  }

  return {
    // Actions
    archiveConversation,
    reopenConversation,
    sendMessage,
    loadConversation,
    
    // Loading states
    isArchiving,
    isReopening,
    isSending
  }
}