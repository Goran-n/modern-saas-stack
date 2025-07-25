<template>
  <FigEmptyState
    :type="mappedType"
    :icon="icon"
    :title="title"
    :description="description"
    :primary-action="primaryAction"
  >
    <template v-if="$slots.action" #actions>
      <slot name="action" />
    </template>
  </FigEmptyState>
</template>

<script setup lang="ts">
import { FigEmptyState } from '@figgy/ui'
import { computed } from 'vue'
import type { EmptyStateAction } from '@figgy/ui'

interface Props {
  type?: 'empty' | 'error' | 'no-results' | 'processing'
  title?: string
  description?: string
  icon?: string
  iconColor?: string
  primaryAction?: EmptyStateAction
}

const props = withDefaults(defineProps<Props>(), {
  type: 'empty'
})

// Map our types to FigEmptyState types
const mappedType = computed(() => {
  const typeMap = {
    empty: 'no-files',
    error: 'error',
    'no-results': 'no-results',
    processing: 'empty'
  } as const
  
  return typeMap[props.type] || 'empty'
})

const icon = computed(() => {
  if (props.icon) return props.icon
  
  const icons = {
    empty: 'i-heroicons-folder-open',
    error: 'i-heroicons-exclamation-triangle',
    'no-results': 'i-heroicons-magnifying-glass',
    processing: 'i-heroicons-clock'
  }
  
  return icons[props.type]
})

const title = computed(() => {
  if (props.title) return props.title
  
  const titles = {
    empty: 'No Files Found',
    error: 'Error Loading Files',
    'no-results': 'No Results',
    processing: 'Processing Files'
  }
  
  return titles[props.type]
})

const description = computed(() => {
  if (props.description) return props.description
  
  const descriptions = {
    empty: 'Upload some files to get started',
    error: 'There was an error loading your files. Please try again.',
    'no-results': 'Try adjusting your filters or search criteria',
    processing: 'Your files are being processed. This may take a few moments.'
  }
  
  return descriptions[props.type]
})
</script>