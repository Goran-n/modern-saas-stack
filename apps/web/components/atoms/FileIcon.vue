<template>
  <Icon
    :name="iconConfig.icon"
    :class="iconClasses"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { getFileIconConfig } from '@figgy/ui'

interface Props {
  fileName: string
  mimeType?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md'
})

const iconConfig = computed(() => getFileIconConfig(props.fileName, props.mimeType))

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8',
} as const

const iconClasses = computed(() => {
  return `inline-block ${iconConfig.value.colorClass} ${sizeClasses[props.size]}`
})
</script>