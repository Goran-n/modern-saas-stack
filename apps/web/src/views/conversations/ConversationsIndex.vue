<template>
  <div class="flex h-full">
    <!-- Sidebar -->
    <div
      class="w-full lg:w-96 border-r border-gray-200 bg-white"
      :class="{ 'hidden lg:block': selectedConversationId }"
    >
      <div class="h-full flex flex-col">
        <!-- Header -->
        <div class="flex-shrink-0 border-b border-gray-200 px-4 py-4">
          <div class="flex items-center justify-between">
            <h1 class="text-lg font-medium text-gray-900">
              Conversations
            </h1>
            <div class="flex items-center space-x-2">
              <!-- Channel filter -->
              <select
                v-model="selectedChannelId"
                class="text-sm rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">
                  All channels
                </option>
                <option
                  v-for="channel in activeChannels"
                  :key="channel.id"
                  :value="channel.id"
                >
                  {{ channel.channelName || channel.channelIdentifier }}
                </option>
              </select>
              
              <!-- Status filter -->
              <select
                v-model="statusFilter"
                class="text-sm rounded-md border-gray-300 focus:border-primary-500 focus:ring-primary-500"
              >
                <option value="">
                  All
                </option>
                <option value="active">
                  Active
                </option>
                <option value="archived">
                  Archived
                </option>
              </select>
            </div>
          </div>
        </div>
        
        <!-- Conversation list -->
        <div class="flex-1 overflow-hidden">
          <VirtualList
            :items="filteredConversations"
            :item-height="72"
            :buffer="3"
            class="h-full px-4 py-4"
          >
            <template #default="{ item }">
              <div
                class="mb-2 p-3 bg-white border rounded-lg cursor-pointer hover:bg-gray-50"
                :class="selectedConversationId === item.id ? 'border-primary-500' : 'border-gray-200'"
                @click="selectConversation(item.id)"
              >
                <div class="flex items-center justify-between">
                  <div class="flex-1 min-w-0">
                    <p class="text-sm font-medium text-gray-900 truncate">
                      {{ getChannelName(item.channelId) }}
                    </p>
                    <p class="text-sm text-gray-500 truncate">
                      {{ item.messageCount }} messages
                    </p>
                  </div>
                  <div class="ml-2 text-xs text-gray-400">
                    {{ formatRelativeDate(item.lastMessageAt) }}
                  </div>
                </div>
              </div>
            </template>
          </VirtualList>
        </div>
      </div>
    </div>
    
    <!-- Main content -->
    <div
      class="flex-1 bg-gray-50"
      :class="{ 'hidden lg:flex': !selectedConversationId }"
    >
      <div
        v-if="!selectedConversationId"
        class="flex-1 flex items-center justify-center"
      >
        <div class="text-center">
          <ChatBubbleLeftRightIcon class="mx-auto h-12 w-12 text-gray-400" />
          <h3 class="mt-2 text-sm font-medium text-gray-900">
            No conversation selected
          </h3>
          <p class="mt-1 text-sm text-gray-500">
            Choose a conversation from the list to start messaging
          </p>
        </div>
      </div>
      
      <div
        v-else
        class="flex-1 flex flex-col"
      >
        <ConversationThread
          :show-back-button="true"
          @back="clearSelection"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline'
import { useCommunicationStore } from '@/stores/communication'
import { provideConversationContext } from '@/composables/useConversationContext'
import { useMemoized } from '@/composables/useMemoized'
import { formatRelativeDate } from '@/utils/date'
import VirtualList from '@/components/ui/VirtualList.vue'
import ConversationThread from '@/components/conversations/ConversationThread.vue'

const router = useRouter()
const route = useRoute()
const store = useCommunicationStore()

// Provide conversation context
provideConversationContext()

// State
const selectedConversationId = ref<string | null>(null)
const selectedChannelId = ref('')
const statusFilter = ref<'' | 'active' | 'archived'>('')

// Computed
const activeChannels = computed(() => store.activeChannels)

// Memoized channel name lookup
const getChannelName = useMemoized((channelId: string) => {
  const channel = store.channels.find(c => c.id === channelId)
  return channel?.channelName || channel?.channelIdentifier || 'Unknown Channel'
})

// Filtered conversations with memoization
const filteredConversations = computed(() => {
  let filtered = store.conversations
  
  if (selectedChannelId.value) {
    filtered = filtered.filter(c => c.channelId === selectedChannelId.value)
  }
  
  if (statusFilter.value) {
    filtered = filtered.filter(c => c.status === statusFilter.value)
  }
  
  // Sort by last message date
  return filtered.sort((a, b) => {
    const dateA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0
    const dateB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0
    return dateB - dateA
  })
})

// Methods
async function selectConversation(conversationId: string) {
  selectedConversationId.value = conversationId
  
  await router.push({
    name: 'conversation-detail',
    params: { id: conversationId }
  })
  
  await store.fetchConversation(conversationId)
}

function clearSelection() {
  selectedConversationId.value = null
  store.clearActiveConversation()
  router.push({ name: 'conversations' })
}

// Initialize
onMounted(async () => {
  await Promise.all([
    store.fetchChannels(),
    store.fetchConversations()
  ])
  
  // Handle route param
  if (route.params.id) {
    const conversationId = Array.isArray(route.params.id) ? route.params.id[0] : route.params.id
    await selectConversation(conversationId)
  }
})

// Watch for route changes
watch(() => route.params.id, async (newId) => {
  if (newId) {
    const conversationId = Array.isArray(newId) ? newId[0] : newId
    await selectConversation(conversationId)
  }
})
</script>