<template>
  <div 
    class="relative rounded-lg border bg-white p-6 shadow-sm transition-all hover:shadow-md"
    :class="{
      'border-gray-200': channel.status !== 'active',
      'border-green-500': channel.status === 'active',
      'opacity-60': channel.status === 'inactive'
    }"
  >
    <!-- Status indicator -->
    <div class="absolute top-4 right-4">
      <ConnectionStatus 
        :status="mapChannelToConnectionStatus(channel.status)"
        size="sm"
        variant="compact"
      />
    </div>
    
    <!-- Channel icon and info -->
    <div class="flex items-start space-x-4">
      <div class="flex-shrink-0">
        <div
          class="h-12 w-12 rounded-full flex items-center justify-center"
          :class="getChannelBgColor(channel.channelType)"
        >
          <component
            :is="getChannelIcon(channel.channelType)"
            class="h-6 w-6 text-white"
          />
        </div>
      </div>
      
      <div class="flex-1 min-w-0">
        <h3 class="text-lg font-medium text-gray-900">
          {{ getChannelDisplayName(channel) }}
        </h3>
        <p class="mt-1 text-sm text-gray-500">
          {{ formatIdentifier(channel) }}
        </p>
        
        <!-- Settings preview -->
        <div
          v-if="channel.settings"
          class="mt-3 space-y-1"
        >
          <div
            v-if="channel.settings.autoDownloadMedia !== undefined"
            class="flex items-center text-xs text-gray-600"
          >
            <CheckIcon
              v-if="channel.settings.autoDownloadMedia"
              class="h-3 w-3 mr-1 text-green-500"
            />
            <XMarkIcon
              v-else
              class="h-3 w-3 mr-1 text-gray-400"
            />
            <span>Auto-download media</span>
          </div>
          <div
            v-if="channel.settings.notificationEnabled !== undefined"
            class="flex items-center text-xs text-gray-600"
          >
            <CheckIcon
              v-if="channel.settings.notificationEnabled"
              class="h-3 w-3 mr-1 text-green-500"
            />
            <XMarkIcon
              v-else
              class="h-3 w-3 mr-1 text-gray-400"
            />
            <span>Notifications enabled</span>
          </div>
          <div
            v-if="channel.settings.maxFileSizeMb"
            class="text-xs text-gray-600"
          >
            Max file size: {{ channel.settings.maxFileSizeMb }}MB
          </div>
        </div>
        
        <!-- Last active -->
        <div
          v-if="channel.lastActiveAt"
          class="mt-2 text-xs text-gray-500"
        >
          Last active: {{ formatDate(channel.lastActiveAt) }}
        </div>
      </div>
    </div>
    
    <!-- Actions -->
    <div class="mt-4 flex items-center space-x-3">
      <button
        v-if="channel.status === 'active'"
        class="text-sm font-medium text-primary-600 hover:text-primary-500"
        @click="$emit('view-conversations')"
      >
        View Conversations
      </button>
      
      <button
        v-if="channel.status === 'active'"
        class="text-sm font-medium text-gray-600 hover:text-gray-900"
        @click="$emit('settings')"
      >
        Settings
      </button>
      
      <button
        v-if="channel.status === 'active'"
        class="text-sm font-medium text-red-600 hover:text-red-500"
        @click="$emit('deactivate')"
      >
        Deactivate
      </button>
      
      <button
        v-if="channel.status === 'inactive'"
        class="text-sm font-medium text-green-600 hover:text-green-500"
        @click="$emit('activate')"
      >
        Reactivate
      </button>
      
      <button
        v-if="channel.status === 'failed'"
        class="text-sm font-medium text-primary-600 hover:text-primary-500"
        @click="$emit('retry')"
      >
        Retry Setup
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CheckIcon, XMarkIcon } from '@heroicons/vue/24/outline'
import { formatDistanceToNow } from 'date-fns'
import { useChannelHelpers } from '../../composables/useChannelHelpers'
import { useConversationStatus } from '../../composables/useConversationStatus'
import ConnectionStatus from '../integrations/ConnectionStatus.vue'
import type { PublicUserChannel } from '@kibly/shared-types'

interface Props {
  channel: PublicUserChannel
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'view-conversations': []
  'settings': []
  'deactivate': []
  'activate': []
  'retry': []
}>()

// Use composables
const { 
  getChannelIcon, 
  getChannelBgColor, 
  getChannelLabel,
  formatChannelIdentifier: formatIdentifier,
  getChannelDisplayName 
} = useChannelHelpers()

const { 
  getChannelStatusClasses, 
  getChannelStatusLabel,
  mapChannelToConnectionStatus 
} = useConversationStatus()

const formatDate = (date: Date | string): string => {
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}
</script>