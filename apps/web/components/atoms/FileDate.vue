<template>
  <div :class="containerClass">
    <span :class="dateClass">{{ formattedDate }}</span>
    <span v-if="showTime" :class="timeClass">{{ formattedTime }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

interface Props {
  date: string | Date
  showTime?: boolean
  size?: 'xs' | 'sm' | 'md' | 'lg'
  layout?: 'inline' | 'stacked'
}

const props = withDefaults(defineProps<Props>(), {
  showTime: false,
  size: 'sm',
  layout: 'inline'
})

const { formatDate, formatTime } = useFileFormatters()

const formattedDate = computed(() => formatDate(props.date))
const formattedTime = computed(() => formatTime(props.date))

const containerClass = computed(() => {
  if (props.layout === 'stacked') {
    return 'flex flex-col'
  }
  return 'inline-flex gap-1'
})

const dateClass = computed(() => {
  const sizes = {
    xs: 'text-xs text-neutral-600',
    sm: 'text-sm text-neutral-700',
    md: 'text-base text-neutral-800',
    lg: 'text-lg text-neutral-900'
  }
  return sizes[props.size]
})

const timeClass = computed(() => {
  const sizes = {
    xs: 'text-xs text-neutral-500',
    sm: 'text-xs text-neutral-600',
    md: 'text-sm text-neutral-700',
    lg: 'text-base text-neutral-800'
  }
  return sizes[props.size]
})
</script>