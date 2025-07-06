import { provide, inject, computed, type InjectionKey, type ComputedRef } from 'vue'
import { useCommunicationStore } from '@/stores/communication'
import { useAuthStore } from '@/stores/auth'
import { useWorkspaceStore } from '@/stores/workspace'
import { ConversationStatus, type PublicConversation, type PublicConversationMessage, type PublicConversationFile, type PublicUserChannel } from '@kibly/shared-types'

export interface ConversationContext {
  conversation: ComputedRef<PublicConversation | null>
  messages: ComputedRef<PublicConversationMessage[]>
  files: ComputedRef<Map<string, PublicConversationFile[]>>
  channels: ComputedRef<PublicUserChannel[]>
  currentChannel: ComputedRef<PublicUserChannel | undefined>
  currentUserId: ComputedRef<string | null>
  currentWorkspaceId: ComputedRef<string | null>
  isLoading: ComputedRef<boolean>
  error: ComputedRef<string | null>
  sendMessage: (content: string) => Promise<boolean>
  archiveConversation: () => Promise<boolean>
  reopenConversation: () => Promise<boolean>
}

const ConversationContextKey: InjectionKey<ConversationContext> = Symbol('ConversationContext')

export function provideConversationContext() {
  const communicationStore = useCommunicationStore()
  const authStore = useAuthStore()
  const workspaceStore = useWorkspaceStore()
  
  const context: ConversationContext = {
    conversation: computed(() => communicationStore.activeConversation?.conversation || null),
    messages: computed(() => communicationStore.activeConversation?.messages || []),
    files: computed(() => communicationStore.activeConversation?.files || new Map()),
    channels: computed(() => communicationStore.channels),
    currentChannel: computed(() => {
      const conversationId = communicationStore.activeConversation?.conversation.channelId
      return communicationStore.channels.find(c => c.id === conversationId)
    }),
    currentUserId: computed(() => authStore.userId),
    currentWorkspaceId: computed(() => workspaceStore.currentWorkspace?.id || null),
    isLoading: computed(() => communicationStore.isLoadingConversation),
    error: computed(() => communicationStore.errors.conversation),
    
    async sendMessage(content: string) {
      const conversation = communicationStore.activeConversation?.conversation
      if (!conversation) return false
      
      return await communicationStore.sendMessage(conversation.id, content)
    },
    
    async archiveConversation() {
      const conversation = communicationStore.activeConversation?.conversation
      if (!conversation) return false
      
      return await communicationStore.updateConversationStatus(conversation.id, ConversationStatus.ARCHIVED)
    },
    
    async reopenConversation() {
      const conversation = communicationStore.activeConversation?.conversation
      if (!conversation) return false
      
      return await communicationStore.updateConversationStatus(conversation.id, ConversationStatus.ACTIVE)
    }
  }
  
  provide(ConversationContextKey, context)
  
  return context
}

export function useConversationContext() {
  const context = inject(ConversationContextKey)
  
  if (!context) {
    throw new Error('useConversationContext must be used within a provider')
  }
  
  return context
}