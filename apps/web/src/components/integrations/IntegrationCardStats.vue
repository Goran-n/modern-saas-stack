<template>
  <div class="px-6 pb-4">
    <div class="grid grid-cols-3 gap-4 text-sm">
      <div>
        <p class="text-neutral-500">Last Sync</p>
        <p class="font-medium text-neutral-900">
          {{ lastSyncDisplay }}
        </p>
      </div>
      <div>
        <p class="text-neutral-500">Total Syncs</p>
        <p class="font-medium text-neutral-900">
          {{ syncCount }}
        </p>
      </div>
      <div>
        <p class="text-neutral-500">Sync Status</p>
        <p :class="syncStatusClasses">
          {{ syncStatusText }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { formatDistanceToNow, parseISO } from 'date-fns'
import type { IntegrationStatus, SyncJobStatus } from '@kibly/shared-types'

interface Props {
  lastSyncAt?: string | null
  syncCount?: number
  status: IntegrationStatus
  syncStatus?: {
    status: SyncJobStatus
  }
}

const props = withDefaults(defineProps<Props>(), {
  syncCount: 0
})

const lastSyncDisplay = computed(() => {
  if (!props.lastSyncAt) return 'Never'
  
  try {
    const date = parseISO(props.lastSyncAt)
    return formatDistanceToNow(date, { addSuffix: true })
  } catch {
    return 'Unknown'
  }
})

const syncStatusText = computed(() => {
  if (props.syncStatus) {
    switch (props.syncStatus.status) {
      case 'running': return 'Syncing...'
      case 'completed': return 'Up to date'
      case 'failed': return 'Failed'
      case 'pending': return 'Queued'
      case 'cancelled': return 'Cancelled'
      default: return 'Ready'
    }
  }
  
  switch (props.status) {
    case 'active': return 'Ready'
    case 'error': return 'Error'
    case 'inactive': return 'Inactive'
    case 'pending': return 'Pending'
    case 'setup_pending': return 'Setup Required'
    default: return 'Unknown'
  }
})

const syncStatusClasses = computed(() => {
  const status = props.syncStatus?.status || props.status
  const baseClasses = 'font-medium text-xs'
  
  switch (status) {
    case 'running':
    case 'pending':
      return `${baseClasses} text-blue-600`
    case 'completed':
    case 'active':
      return `${baseClasses} text-green-600`
    case 'failed':
    case 'error':
      return `${baseClasses} text-red-600`
    case 'cancelled':
    case 'inactive':
      return `${baseClasses} text-neutral-600`
    case 'pending':
    case 'setup_pending':
      return `${baseClasses} text-yellow-600`
    default:
      return `${baseClasses} text-neutral-900`
  }
})
</script>