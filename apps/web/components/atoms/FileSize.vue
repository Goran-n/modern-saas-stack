<template>
  <span :class="sizeClass">
    {{ formattedSize }}
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  bytes: number
  size?: 'xs' | 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'sm'
})

const { formatFileSize } = useFileFormatters()

const formattedSize = computed(() => formatFileSize(props.bytes))

const sizeClass = computed(() => {
  const sizes = {
    xs: 'text-xs text-neutral-500',
    sm: 'text-sm text-neutral-600',
    md: 'text-base text-neutral-700',
    lg: 'text-lg text-neutral-800'
  }
  return sizes[props.size]
})
</script>