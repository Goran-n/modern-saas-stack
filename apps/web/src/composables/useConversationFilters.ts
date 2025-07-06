import { ref, computed } from 'vue'
import type { PublicConversation, ConversationStatus } from '@kibly/shared-types'

/**
 * Composable for handling conversation filtering and sorting
 */
export function useConversationFilters(conversations: PublicConversation[]) {
  // Filter state
  const selectedChannelId = ref('')
  const statusFilter = ref<ConversationStatus | ''>('')
  const searchQuery = ref('')

  /**
   * Filtered conversations based on current filters
   */
  const filteredConversations = computed(() => {
    let filtered = [...conversations]

    // Filter by channel
    if (selectedChannelId.value) {
      filtered = filtered.filter(c => c.channelId === selectedChannelId.value)
    }

    // Filter by status
    if (statusFilter.value) {
      filtered = filtered.filter(c => c.status === statusFilter.value)
    }

    // Filter by search query (in metadata or channel info)
    if (searchQuery.value) {
      const query = searchQuery.value.toLowerCase()
      filtered = filtered.filter(c => {
        const lastMessage = c.metadata?.lastMessage as string | undefined
        return lastMessage?.toLowerCase().includes(query) || false
      })
    }

    // Sort by most recent activity
    return filtered.sort((a, b) => {
      const dateA = new Date(a.lastMessageAt || a.createdAt).getTime()
      const dateB = new Date(b.lastMessageAt || b.createdAt).getTime()
      return dateB - dateA
    })
  })

  /**
   * Reset all filters
   */
  const resetFilters = () => {
    selectedChannelId.value = ''
    statusFilter.value = ''
    searchQuery.value = ''
  }

  /**
   * Set channel filter from route or external source
   */
  const setChannelFilter = (channelId: string) => {
    selectedChannelId.value = channelId
  }

  /**
   * Get count of conversations by status
   */
  const conversationCounts = computed(() => {
    const counts = {
      total: conversations.length,
      active: 0,
      archived: 0,
      closed: 0
    }

    conversations.forEach(c => {
      if (c.status === 'active') counts.active++
      else if (c.status === 'archived') counts.archived++
      else if (c.status === 'closed') counts.closed++
    })

    return counts
  })

  return {
    // Filter state
    selectedChannelId,
    statusFilter,
    searchQuery,
    
    // Computed
    filteredConversations,
    conversationCounts,
    
    // Actions
    resetFilters,
    setChannelFilter
  }
}