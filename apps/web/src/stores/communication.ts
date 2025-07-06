import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { trpc, safeTRPCQuery } from '@/lib/trpc'
import { getErrorMessage } from '@/utils/error'
import { ChannelStatus } from '@kibly/shared-types'
import type { 
  PublicUserChannel,
  PublicConversation,
  PublicConversationMessage,
  PublicConversationFile,
  ConversationStatus
} from '@kibly/shared-types'

interface ConversationWithMessages {
  conversation: PublicConversation
  messages: PublicConversationMessage[]
  files: Map<string, PublicConversationFile[]>
}

interface ConversationListResponse {
  conversations: Array<Omit<PublicConversation, 'createdAt' | 'updatedAt' | 'lastMessageAt'> & {
    createdAt: string
    updatedAt: string
    lastMessageAt?: string | null
  }>
  total: number
}

interface ConversationDetailResponse {
  conversation: Omit<PublicConversation, 'createdAt' | 'updatedAt' | 'lastMessageAt'> & {
    createdAt: string
    updatedAt: string
    lastMessageAt?: string | null
  }
  messages: Array<Omit<PublicConversationMessage, 'createdAt'> & {
    createdAt: string
  }>
  files: Array<{
    messageId: string
    files: Array<Omit<PublicConversationFile, 'createdAt'> & {
      createdAt: string
    }>
  }>
}

export const useCommunicationStore = defineStore('communication', () => {
  // State
  const channels = ref<PublicUserChannel[]>([])
  const conversations = ref<PublicConversation[]>([])
  const activeConversation = ref<ConversationWithMessages | null>(null)
  const isLoadingChannels = ref(false)
  const isLoadingConversations = ref(false)
  const isLoadingConversation = ref(false)
  const errors = ref<Record<string, string | null>>({
    channels: null,
    conversations: null,
    conversation: null,
    sendMessage: null
  })
  
  // Getters
  const activeChannels = computed(() => 
    channels.value.filter(channel => channel.status === 'active')
  )
  
  const whatsappChannels = computed(() =>
    channels.value.filter(channel => channel.channelType === 'whatsapp')
  )
  
  const hasActiveWhatsApp = computed(() =>
    whatsappChannels.value.some(channel => channel.status === 'active')
  )
  
  const conversationsByChannel = computed(() => {
    const map = new Map<string, PublicConversation[]>()
    
    conversations.value.forEach(conversation => {
      const channelConversations = map.get(conversation.channelId) || []
      channelConversations.push(conversation)
      map.set(conversation.channelId, channelConversations)
    })
    
    return map
  })
  
  // Actions
  async function fetchChannels(): Promise<void> {
    isLoadingChannels.value = true
    errors.value.channels = null
    
    try {
      const data = await safeTRPCQuery(
        () => trpc.userChannel.list.query(),
        'Loading channels'
      )
      
      if (data) {
      channels.value = data.map(channel => ({
        ...channel,
        createdAt: new Date(channel.createdAt),
        updatedAt: new Date(channel.updatedAt),
        lastActiveAt: channel.lastActiveAt ? new Date(channel.lastActiveAt) : null
      }))
      }
    } catch (error) {
      errors.value.channels = getErrorMessage(error)
    } finally {
      isLoadingChannels.value = false
    }
  }
  
  async function fetchConversations(filters?: {
    channelId?: string
    status?: ConversationStatus[]
  }): Promise<void> {
    isLoadingConversations.value = true
    errors.value.conversations = null
    
    try {
      const data = await safeTRPCQuery<any>(
        () => trpc.conversation.list.query({
          status: filters?.status
        }),
        'Loading conversations'
      )
      
      if (data) {
        // Handle the API response format { data: conversations, pagination: {...} }
        const responseData: ConversationListResponse = 'data' in data && 'pagination' in data 
          ? { conversations: data.data, total: data.pagination.total }
          : data
          
        conversations.value = responseData.conversations.map((conv: any) => ({
          ...conv,
          createdAt: new Date(conv.createdAt),
          updatedAt: new Date(conv.updatedAt),
          lastMessageAt: conv.lastMessageAt ? new Date(conv.lastMessageAt) : null
        }))
      }
    } catch (error) {
      errors.value.conversations = getErrorMessage(error)
    } finally {
      isLoadingConversations.value = false
    }
  }
  
  async function fetchConversation(conversationId: string): Promise<void> {
    isLoadingConversation.value = true
    errors.value.conversation = null
    
    try {
      const data = await safeTRPCQuery<any>(
        () => trpc.conversation.get.query({ conversationId }),
        'Loading conversation'
      )
      
      if (data) {
      // Transform files array to Map (handle missing files property)
      const filesMap = new Map<string, PublicConversationFile[]>()
      if (data.files) {
        data.files.forEach(({ messageId, files }: any) => {
          filesMap.set(messageId, files.map((file: any) => ({
            ...file,
            createdAt: new Date(file.createdAt)
          })))
        })
      }
      
      activeConversation.value = {
        conversation: {
          ...data.conversation,
          createdAt: new Date(data.conversation.createdAt),
          updatedAt: new Date(data.conversation.updatedAt),
          lastMessageAt: data.conversation.lastMessageAt ? new Date(data.conversation.lastMessageAt) : null
        },
        messages: data.messages.map((msg: any) => ({
          ...msg,
          createdAt: new Date(msg.createdAt)
        })),
        files: filesMap
      }
      }
    } catch (error) {
      errors.value.conversation = getErrorMessage(error)
    } finally {
      isLoadingConversation.value = false
    }
  }
  
  async function sendMessage(conversationId: string, content: string): Promise<boolean> {
    errors.value.sendMessage = null
    
    try {
      await safeTRPCQuery(
        () => trpc.conversation.sendMessage.mutate({
          conversationId,
          content
        }),
        'Sending message'
      )
      
      // Message sent successfully
      // Refresh conversation if it's the active one
      if (activeConversation.value?.conversation.id === conversationId) {
        await fetchConversation(conversationId)
      }
      
      return true
    } catch (error) {
      errors.value.sendMessage = getErrorMessage(error)
      return false
    }
  }
  
  async function updateConversationStatus(
    conversationId: string,
    status: ConversationStatus
  ): Promise<boolean> {
    try {
      await safeTRPCQuery(
        () => status === 'archived' 
          ? trpc.conversation.archive.mutate({ conversationId })
          : trpc.conversation.archive.mutate({ conversationId }), // Note: API doesn't have reopen yet
        'Updating conversation status'
      )
    
    // Update local state optimistically
    const conversation = conversations.value.find(c => c.id === conversationId)
    if (conversation) {
      conversation.status = status
    }
    
    if (activeConversation.value?.conversation.id === conversationId) {
      activeConversation.value.conversation.status = status
    }
    
    return true
    } catch (error) {
      return false
    }
  }
  
  async function deactivateChannel(channelId: string): Promise<boolean> {
    try {
      await safeTRPCQuery(
        () => trpc.userChannel.disconnect.mutate({ channelId }),
        'Deactivating channel'
      )
    
    // Update local state
    const channel = channels.value.find(c => c.id === channelId)
    if (channel) {
      channel.status = ChannelStatus.INACTIVE
    }
    
    return true
    } catch (error) {
      return false
    }
  }
  
  function clearActiveConversation(): void {
    activeConversation.value = null
  }
  
  function clearError(key: keyof typeof errors.value): void {
    errors.value[key] = null
  }
  
  return {
    // State
    channels,
    conversations,
    activeConversation,
    isLoadingChannels,
    isLoadingConversations,
    isLoadingConversation,
    errors,
    
    // Getters
    activeChannels,
    whatsappChannels,
    hasActiveWhatsApp,
    conversationsByChannel,
    
    // Actions
    fetchChannels,
    fetchConversations,
    fetchConversation,
    sendMessage,
    updateConversationStatus,
    deactivateChannel,
    clearActiveConversation,
    clearError
  }
})