<template>
  <div class="border-t border-neutral-200 bg-neutral-50 px-6 py-3">
    <div class="flex justify-between items-center">
      <button
        v-if="status === 'active' && canManage"
        @click="$emit('sync')"
        :disabled="loading"
        class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowPathIcon class="w-3 h-3 mr-1" />
        Sync Now
      </button>
      
      <button
        v-else-if="needsReconnection && canManage"
        @click="$emit('reconnect')"
        :disabled="loading"
        class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <ArrowPathIcon class="w-3 h-3 mr-1" />
        Reconnect
      </button>
      
      <button
        v-else-if="(status === 'error' || status === 'setup_pending') && canManage"
        @click="$emit('test-connection')"
        :disabled="loading"
        class="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-yellow-700 bg-yellow-100 hover:bg-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <SignalIcon class="w-3 h-3 mr-1" />
        {{ status === 'setup_pending' ? 'Complete Setup' : 'Test Connection' }}
      </button>

      <span v-if="status === 'pending'" class="text-xs text-neutral-500">
        Setup in progress...
      </span>

      <span v-if="status === 'setup_pending' && !needsReconnection" class="text-xs text-neutral-500">
        Click "Complete Setup" to activate
      </span>

      <div class="text-xs text-neutral-500">
        {{ createdAtDisplay }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ArrowPathIcon, SignalIcon } from '@heroicons/vue/24/outline'
import { formatDistanceToNow, parseISO } from 'date-fns'
import type { IntegrationStatus } from '@kibly/shared-types'

interface Props {
  status: IntegrationStatus
  canManage: boolean
  needsReconnection: boolean
  createdAt: string
  loading?: boolean
}

interface Emits {
  (e: 'sync'): void
  (e: 'reconnect'): void
  (e: 'test-connection'): void
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

defineEmits<Emits>()

const createdAtDisplay = computed(() => {
  try {
    const date = parseISO(props.createdAt)
    return `Added ${formatDistanceToNow(date, { addSuffix: true })}`
  } catch {
    return ''
  }
})
</script>