<template>
  <div class="flex items-center gap-2">
    <!-- Status Badge -->
    <FigStatusBadge
      v-if="showBadge"
      :status="status"
      :type="badgeType"
      :variant="badgeVariant"
      :size="badgeSize"
    />
    
    <!-- Optional Status Text -->
    <span 
      v-if="showText && statusText"
      :class="textClass"
    >
      {{ statusText }}
    </span>
    
    <!-- Error Details -->
    <button
      v-if="status === 'failed' && errorMessage && showErrorDetails"
      @click="$emit('show-error')"
      class="text-xs text-error-600 hover:text-error-700 underline focus:outline-none focus:ring-2 focus:ring-error-500 focus:ring-offset-1 rounded"
      :aria-label="`View error details for ${fileName || 'file'}`"
    >
      View details
    </button>
  </div>
</template>

<script setup lang="ts">
import { FigStatusBadge } from '@figgy/ui'
import { computed } from 'vue'

type ProcessingStatus = 'processing' | 'completed' | 'failed' | 'pending'

interface Props {
  status: ProcessingStatus | string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showBadge?: boolean
  showText?: boolean
  showErrorDetails?: boolean
  errorMessage?: string | null
  fileName?: string
  badgeType?: 'processing' | 'validation' | 'confidence'
  badgeVariant?: 'solid' | 'soft' | 'outline'
}

interface Emits {
  (e: 'show-error'): void
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm',
  showBadge: true,
  showText: false,
  showErrorDetails: true,
  badgeType: 'processing',
  badgeVariant: 'soft'
})

defineEmits<Emits>()

const statusText = computed(() => {
  const statusMap: Record<string, string> = {
    processing: 'Processing...',
    completed: 'Completed',
    failed: 'Failed',
    pending: 'Pending'
  }
  return statusMap[props.status] || props.status
})

const textClass = computed(() => {
  const sizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }
  
  const statusColors: Record<string, string> = {
    processing: 'text-info-600',
    completed: 'text-success-600',
    failed: 'text-error-600',
    pending: 'text-neutral-600'
  }
  
  const color = statusColors[props.status] || 'text-neutral-600'
  
  return `${sizes[props.size]} ${color}`
})

const badgeSize = computed(() => {
  // Map component size to badge size
  const sizeMap = {
    xs: 'xs',
    sm: 'xs',
    md: 'sm',
    lg: 'md'
  } as const
  
  return sizeMap[props.size] || 'sm'
})
</script>