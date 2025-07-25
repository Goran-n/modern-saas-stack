<template>
  <FigStatusBadge
    v-if="type === 'status'"
    :status="value"
    :type="statusType"
    :variant="variant"
    :size="size"
  />
  <FigBadge
    v-else
    :color="badgeColor"
    :variant="variant"
    :size="size"
  >
    <slot>{{ displayValue }}</slot>
  </FigBadge>
</template>

<script setup lang="ts">
import { FigBadge, FigStatusBadge } from '@figgy/ui'
import { computed } from 'vue'

interface Props {
  type: 'status' | 'confidence' | 'count' | 'custom'
  value: string | number
  statusType?: 'processing' | 'validation' | 'confidence'
  variant?: 'solid' | 'soft' | 'outline'
  size?: 'xs' | 'sm' | 'md' | 'lg'
  color?: 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'
}

const props = withDefaults(defineProps<Props>(), {
  statusType: 'processing',
  variant: 'soft',
  size: 'sm'
})

const displayValue = computed(() => {
  if (props.type === 'confidence' && typeof props.value === 'number') {
    return `${Math.round(props.value)}%`
  }
  return String(props.value)
})

const badgeColor = computed(() => {
  if (props.color) return props.color
  
  if (props.type === 'confidence' && typeof props.value === 'number') {
    if (props.value >= 90) return 'success'
    if (props.value >= 70) return 'warning'
    return 'error'
  }
  
  return 'neutral'
})
</script>