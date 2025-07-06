<template>
  <div class="flex flex-col h-full">
    <!-- Header -->
    <div class="flex-shrink-0 border-b border-gray-200 bg-white px-4 py-3">
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <button
            v-if="showBackButton"
            class="lg:hidden -ml-2 p-2 rounded-md hover:bg-gray-100"
            @click="$emit('back')"
          >
            <ArrowLeftIcon class="h-5 w-5 text-gray-500" />
          </button>
          <div>
            <h2 class="text-base font-medium text-gray-900">
              {{ currentChannel?.channelName || 'Conversation' }}
            </h2>
            <p class="text-sm text-gray-500">
              {{ conversation?.messageCount || 0 }} messages
            </p>
          </div>
        </div>
        
        <div class="flex items-center space-x-2">
          <button
            v-if="conversation?.status === 'active'"
            class="p-2 rounded-md hover:bg-gray-100"
            title="Archive conversation"
            @click="handleArchive"
          >
            <ArchiveBoxIcon class="h-5 w-5 text-gray-500" />
          </button>
          <button
            v-else-if="conversation?.status === 'archived'"
            class="p-2 rounded-md hover:bg-gray-100"
            title="Reopen conversation"
            @click="handleReopen"
          >
            <ArrowPathIcon class="h-5 w-5 text-gray-500" />
          </button>
        </div>
      </div>
    </div>
    
    <!-- Messages -->
    <div
      ref="messagesContainer"
      class="flex-1 overflow-y-auto px-4 py-4 space-y-4"
    >
      <div
        v-if="isLoading"
        class="text-center py-8"
      >
        <div class="inline-flex items-center justify-center w-8 h-8">
          <svg
            class="animate-spin h-6 w-6 text-primary-600"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              class="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              stroke-width="4"
            />
            <path
              class="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        </div>
      </div>
      
      <div
        v-else-if="messages.length === 0"
        class="text-center py-8 text-gray-500"
      >
        No messages yet
      </div>
      
      <div
        v-else
        class="space-y-4"
      >
        <template
          v-for="(message, index) in messages"
          :key="message.id"
        >
          <!-- Date separator -->
          <div
            v-if="shouldShowDateSeparator(message.createdAt, messages[index - 1]?.createdAt)"
            class="relative"
          >
            <div
              class="absolute inset-0 flex items-center"
              aria-hidden="true"
            >
              <div class="w-full border-t border-gray-200" />
            </div>
            <div class="relative flex justify-center">
              <span class="px-3 bg-white text-sm text-gray-500">
                {{ formatRelativeDate(message.createdAt) }}
              </span>
            </div>
          </div>
          
          <!-- Message -->
          <div
            class="flex"
            :class="message.direction === 'inbound' ? 'justify-start' : 'justify-end'"
          >
            <div
              class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg"
              :class="message.direction === 'inbound' 
                ? 'bg-gray-100 text-gray-900' 
                : 'bg-primary-600 text-white'"
            >
              <p
                v-if="message.content"
                class="text-sm whitespace-pre-wrap"
              >
                {{ message.content }}
              </p>
              
              <!-- Files -->
              <div
                v-if="messageFiles.get(message.id)?.length"
                class="mt-2 space-y-2"
              >
                <div
                  v-for="file in messageFiles.get(message.id)"
                  :key="file.id"
                  class="flex items-center space-x-2 p-2 rounded"
                  :class="message.direction === 'inbound' 
                    ? 'bg-gray-200' 
                    : 'bg-primary-700'"
                >
                  <DocumentIcon class="h-5 w-5 flex-shrink-0" />
                  <span class="text-sm truncate">
                    {{ file.originalName || 'Document' }}
                  </span>
                </div>
              </div>
              
              <!-- Metadata -->
              <div class="mt-1 text-xs opacity-70">
                {{ formatTime(message.createdAt) }}
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
    
    <!-- Input -->
    <div
      v-if="conversation?.status === 'active'"
      class="flex-shrink-0 border-t border-gray-200 bg-white px-4 py-3"
    >
      <form
        class="flex space-x-3"
        @submit.prevent="handleSendMessage"
      >
        <input
          v-model="newMessage"
          type="text"
          placeholder="Type a message..."
          class="flex-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          :disabled="sending"
        >
        <BaseButton
          type="submit"
          variant="primary"
          :loading="sending"
          :disabled="!newMessage.trim() || sending"
        >
          Send
        </BaseButton>
      </form>
    </div>
    
    <!-- Archived/Closed notice -->
    <div
      v-else
      class="flex-shrink-0 border-t border-gray-200 bg-gray-50 px-4 py-3"
    >
      <p class="text-sm text-gray-500 text-center">
        This conversation is {{ conversation?.status }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import { ArrowLeftIcon, ArchiveBoxIcon, ArrowPathIcon, DocumentIcon } from '@heroicons/vue/24/outline'
import { useConversationContext } from '@/composables/useConversationContext'
import { formatTime, formatRelativeDate, shouldShowDateSeparator } from '@/utils/date'
import BaseButton from '@/components/ui/BaseButton.vue'

interface Props {
  showBackButton?: boolean
}

withDefaults(defineProps<Props>(), {
  showBackButton: false
})

defineEmits<{
  back: []
}>()

const {
  conversation,
  messages,
  files: messageFiles,
  currentChannel,
  isLoading,
  sendMessage,
  archiveConversation,
  reopenConversation
} = useConversationContext()

const messagesContainer = ref<HTMLElement>()
const newMessage = ref('')
const sending = ref(false)

// Scroll to bottom when messages change
watch(messages, async () => {
  await nextTick()
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
})

async function handleSendMessage() {
  if (!newMessage.value.trim() || sending.value) return
  
  sending.value = true
  const success = await sendMessage(newMessage.value)
  
  if (success) {
    newMessage.value = ''
  }
  
  sending.value = false
}

async function handleArchive() {
  await archiveConversation()
}

async function handleReopen() {
  await reopenConversation()
}
</script>