<template>
  <div :class="containerClasses">
    <!-- Status indicator -->
    <div :class="indicatorClasses">
      <!-- Healthy status -->
      <CheckCircleIcon v-if="status === 'healthy'" :class="iconClasses" />
      
      <!-- Warning status -->
      <ExclamationTriangleIcon v-else-if="status === 'warning'" :class="iconClasses" />
      
      <!-- Error status -->
      <XCircleIcon v-else-if="status === 'error'" :class="iconClasses" />
      
      <!-- Syncing status -->
      <ArrowPathIcon v-else-if="status === 'syncing'" :class="[iconClasses, 'animate-spin']" />
      
      <!-- Pending/Unknown status -->
      <ClockIcon v-else :class="iconClasses" />
    </div>

    <!-- Status text -->
    <div v-if="showText" :class="textContainerClasses">
      <span :class="statusTextClasses">{{ statusLabel }}</span>
      <span v-if="message && showMessage" :class="messageTextClasses">{{ message }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { 
  CheckCircleIcon, 
  ExclamationTriangleIcon, 
  XCircleIcon, 
  ClockIcon, 
  ArrowPathIcon 
} from '@heroicons/vue/24/solid'

interface Props {
  status: 'healthy' | 'warning' | 'error' | 'syncing' | 'pending' | 'unknown'
  message?: string
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showText?: boolean
  showMessage?: boolean
  variant?: 'default' | 'compact' | 'detailed'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showText: true,
  showMessage: true,
  variant: 'default'
})

const statusLabel = computed(() => {
  const labels = {
    healthy: 'Connected',
    warning: 'Issues',
    error: 'Error',
    syncing: 'Syncing',
    pending: 'Pending',
    unknown: 'Unknown'
  }
  return labels[props.status]
})

const containerClasses = computed(() => {
  const baseClasses = 'inline-flex items-center'
  
  if (props.variant === 'compact') {
    return `${baseClasses} space-x-1`
  }
  
  if (props.variant === 'detailed') {
    return `${baseClasses} space-x-3 p-3 rounded-lg border`
  }
  
  return `${baseClasses} space-x-2`
})

const indicatorClasses = computed(() => {
  const baseClasses = 'flex-shrink-0'
  
  if (props.variant === 'detailed') {
    return `${baseClasses} p-1 rounded-full`
  }
  
  return baseClasses
})

const iconClasses = computed(() => {
  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }
  
  const colorClasses = {
    healthy: 'text-green-500',
    warning: 'text-yellow-500',
    error: 'text-red-500',
    syncing: 'text-blue-500',
    pending: 'text-neutral-400',
    unknown: 'text-neutral-400'
  }
  
  return `${sizeClasses[props.size]} ${colorClasses[props.status]}`
})

const textContainerClasses = computed(() => {
  if (props.variant === 'detailed') {
    return 'flex flex-col'
  }
  return 'flex flex-col min-w-0'
})

const statusTextClasses = computed(() => {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base'
  }
  
  const colorClasses = {
    healthy: 'text-green-700',
    warning: 'text-yellow-700',
    error: 'text-red-700',
    syncing: 'text-blue-700',
    pending: 'text-neutral-600',
    unknown: 'text-neutral-600'
  }
  
  const baseClasses = 'font-medium truncate'
  
  return `${baseClasses} ${sizeClasses[props.size]} ${colorClasses[props.status]}`
})

const messageTextClasses = computed(() => {
  const sizeClasses = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm'
  }
  
  return `${sizeClasses[props.size]} text-neutral-500 truncate mt-0.5`
})
</script>