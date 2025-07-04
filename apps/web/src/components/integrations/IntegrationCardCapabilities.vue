<template>
  <div class="px-6 pb-6">
    <div class="flex flex-wrap gap-1">
      <span
        v-for="capability in displayCapabilities"
        :key="capability"
        class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700"
      >
        {{ capability }}
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Capabilities {
  read: string[]
  write: string[]
  webhook: boolean
  realtime: boolean
  fileUpload: boolean
  batchOperations: boolean
}

interface Props {
  capabilities: Capabilities
  maxDisplay?: number
}

const props = withDefaults(defineProps<Props>(), {
  maxDisplay: 4
})

const displayCapabilities = computed(() => {
  const caps = props.capabilities
  const result: string[] = []
  
  if (caps.read.length > 0) result.push('Read')
  if (caps.write.length > 0) result.push('Write')
  if (caps.webhook) result.push('Webhooks')
  if (caps.realtime) result.push('Real-time')
  if (caps.fileUpload) result.push('Files')
  if (caps.batchOperations) result.push('Batch')
  
  return result.slice(0, props.maxDisplay)
})
</script>