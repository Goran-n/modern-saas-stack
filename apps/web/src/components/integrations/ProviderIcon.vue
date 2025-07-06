<template>
  <div 
    :class="[
      'inline-flex items-center justify-center bg-white border border-neutral-200 rounded-lg shadow-sm',
      sizeClasses,
      iconClasses
    ]"
    :title="providerName"
  >
    <!-- Xero -->
    <svg
      v-if="provider === 'xero'"
      :class="svgClasses"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path 
        d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm3.5 16L12 14l-3.5 4H6l5-6-5-6h2.5L12 10l3.5-4H18l-5 6 5 6h-2.5z" 
        fill="#13B5EA"
      />
    </svg>


    <!-- Generic/Unknown provider -->
    <svg
      v-else
      :class="svgClasses"
      viewBox="0 0 24 24"
      fill="none"
    >
      <path 
        d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zm0 14a2 2 0 1 1 0-4 2 2 0 0 1 0 4zm1-6h-2V7h2v3z" 
        fill="#6B7280"
      />
    </svg>

    <!-- Provider name text for smaller sizes -->
    <span 
      v-if="showText && (size === 'xs' || size === 'sm')" 
      :class="textClasses"
    >
      {{ providerName }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { IntegrationProvider } from '@kibly/shared-types'

interface Props {
  provider: IntegrationProvider
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  showText?: boolean
  variant?: 'default' | 'minimal' | 'error'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  showText: false,
  variant: 'default'
})

const providerName = computed(() => {
  return props.provider === 'xero' ? 'Xero' : 'Unknown'
})

const sizeClasses = computed(() => {
  const sizes = {
    xs: 'w-6 h-6 p-1',
    sm: 'w-8 h-8 p-1.5',
    md: 'w-10 h-10 p-2',
    lg: 'w-12 h-12 p-2.5',
    xl: 'w-16 h-16 p-3'
  }
  return sizes[props.size]
})

const iconClasses = computed(() => {
  if (props.variant === 'minimal') {
    return 'border-0 shadow-none bg-transparent'
  } else if (props.variant === 'error') {
    return 'border-red-200 bg-red-50'
  }
  return ''
})

const svgClasses = computed(() => {
  return 'w-full h-full'
})

const textClasses = computed(() => {
  const sizes = {
    xs: 'text-xs font-medium ml-1',
    sm: 'text-sm font-medium ml-1.5',
    md: 'text-sm font-medium ml-2',
    lg: 'text-base font-medium ml-2',
    xl: 'text-lg font-medium ml-2'
  }
  return `${sizes[props.size]} text-neutral-700 truncate`
})
</script>