<template>
  <div class="space-y-3">
    <div
      v-if="loading"
      class="text-center py-8"
    >
      <BaseSpinner />
    </div>
    
    <div
      v-else-if="conversations.length === 0"
      class="text-center py-8"
    >
      <div class="mx-auto max-w-sm">
        <ChatBubbleLeftRightIcon class="mx-auto h-12 w-12 text-gray-400" />
        <h3 class="mt-2 text-sm font-medium text-gray-900">
          No conversations
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ emptyMessage || 'Start a conversation by sending a message to our WhatsApp number' }}
        </p>
      </div>
    </div>
    
    <div
      v-else
      class="space-y-3"
    >
      <div
        v-for="conversation in conversations"
        :key="conversation.id"
        class="relative rounded-lg border border-gray-200 bg-white px-4 py-4 hover:border-gray-300 cursor-pointer transition-colors"
        :class="{
          'ring-2 ring-primary-500 border-transparent': selectedId === conversation.id
        }"
        @click="$emit('select', conversation)"
      >
        <div class="flex items-start justify-between">
          <div class="flex-1 min-w-0">
            <div class="flex items-center space-x-3">
              <div class="flex-shrink-0">
                <div 
                  class="h-10 w-10 rounded-full flex items-center justify-center"
                  :class="getChannelForConversation(conversation.channelId) 
                    ? getChannelBgColor(getChannelForConversation(conversation.channelId)!.channelType)
                    : 'bg-gray-200'"
                >
                  <component 
                    :is="getChannelForConversation(conversation.channelId) 
                      ? getChannelIcon(getChannelForConversation(conversation.channelId)!.channelType)
                      : ChatBubbleLeftRightIcon" 
                    class="h-5 w-5 text-white" 
                  />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-gray-900 truncate">
                  {{ getChannelNameById(conversation.channelId, channels) }}
                </p>
                <div class="mt-1 flex items-center space-x-2 text-xs text-gray-500">
                  <span>{{ conversation.messageCount }} messages</span>
                  <span>·</span>
                  <span>{{ formatConversationDate(conversation.lastMessageAt || conversation.createdAt) }}</span>
                </div>
              </div>
            </div>
            
            <div
              v-if="conversation.metadata?.lastMessage"
              class="mt-2 text-sm text-gray-600 line-clamp-2"
            >
              {{ conversation.metadata.lastMessage }}
            </div>
          </div>
          
          <div class="ml-4 flex-shrink-0">
            <span
              class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium"
              :class="getConversationStatusClasses(conversation.status)"
            >
              {{ getConversationStatusLabel(conversation.status) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ChatBubbleLeftRightIcon } from '@heroicons/vue/24/outline'
import BaseSpinner from '../ui/BaseSpinner.vue'
import { useChannelHelpers } from '../../composables/useChannelHelpers'
import { useConversationStatus } from '../../composables/useConversationStatus'
import { useMessageHelpers } from '../../composables/useMessageHelpers'
import type { PublicConversation, PublicUserChannel } from '@kibly/shared-types'

interface Props {
  conversations: PublicConversation[]
  channels: PublicUserChannel[]
  loading?: boolean
  selectedId?: string | null
  emptyMessage?: string
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
  selectedId: null
})

const emit = defineEmits<{
  select: [conversation: PublicConversation]
}>()

// Use composables
const { getChannelNameById, getChannelIcon, getChannelBgColor } = useChannelHelpers()
const { getConversationStatusClasses, getConversationStatusLabel } = useConversationStatus()
const { formatConversationDate } = useMessageHelpers()

// Helper to get channel for a conversation
const getChannelForConversation = (channelId: string) => {
  return props.channels.find(c => c.id === channelId)
}
</script>