<template>
  <span
    :class="[iconConfig.icon, iconClasses]"
    v-bind="$attrs"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileIconProps } from './types'
import { getFileIconConfig } from './utils'

const props = withDefaults(defineProps<FileIconProps>(), {
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