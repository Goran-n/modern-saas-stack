<template>
  <div class="flex flex-col items-center justify-center p-8 text-center">
    <!-- Image or Icon -->
    <div v-if="props.image" class="mb-6">
      <img 
        :src="props.image" 
        :alt="computedTitle"
        class="w-64 h-64 object-contain"
      />
    </div>
    <div 
      v-else
      class="mb-4 rounded-full p-3"
      :class="iconBackgroundClass"
    >
      <FigIcon 
        :name="computedIcon" 
        :class="iconClass"
        class="text-3xl"
      />
    </div>
    
    <!-- Title -->
    <h3 class="mb-2 text-lg font-semibold text-neutral-900">
      <slot name="title">{{ computedTitle }}</slot>
    </h3>
    
    <!-- Description -->
    <p class="mb-6 text-sm text-neutral-600 max-w-md">
      <slot name="description">{{ computedDescription }}</slot>
    </p>
    
    <!-- Actions -->
    <div v-if="$slots.actions || primaryAction" class="flex gap-3">
      <slot name="actions">
        <FigButton
          v-if="primaryAction"
          :variant="primaryAction.variant || 'solid'"
          :icon="primaryAction.icon"
          @click="primaryAction.onClick"
        >
          {{ primaryAction.label }}
        </FigButton>
        <FigButton
          v-if="secondaryAction"
          :variant="secondaryAction.variant || 'outline'"
          :icon="secondaryAction.icon"
          @click="secondaryAction.onClick"
        >
          {{ secondaryAction.label }}
        </FigButton>
      </slot>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import FigIcon from '../../atoms/Icon/Icon.vue'
import FigButton from '../../atoms/Button/Button.vue'
import type { EmptyStateProps } from './types'

const props = withDefaults(defineProps<EmptyStateProps>(), {
  type: 'empty'
})

// Compute icon based on type
const computedIcon = computed(() => {
  if (props.icon) return props.icon
  
  const iconMap = {
    empty: 'i-heroicons-inbox',
    'no-results': 'i-heroicons-magnifying-glass',
    error: 'i-heroicons-exclamation-triangle',
    'no-access': 'i-heroicons-lock-closed',
    'no-files': 'i-heroicons-document',
    'no-data': 'i-heroicons-chart-bar',
    'coming-soon': 'i-heroicons-clock',
    success: 'i-heroicons-check-circle'
  }
  
  return iconMap[props.type] || iconMap.empty
})

// Compute title based on type
const computedTitle = computed(() => {
  if (props.title) return props.title
  
  const titleMap = {
    empty: 'No items found',
    'no-results': 'No results found',
    error: 'Something went wrong',
    'no-access': 'Access denied',
    'no-files': 'No files yet',
    'no-data': 'No data available',
    'coming-soon': 'Coming soon',
    success: 'Success!'
  }
  
  return titleMap[props.type] || titleMap.empty
})

// Compute description based on type
const computedDescription = computed(() => {
  if (props.description) return props.description
  
  const descriptionMap = {
    empty: 'There are no items to display at the moment.',
    'no-results': 'Try adjusting your search or filters.',
    error: 'An error occurred while loading the content. Please try again.',
    'no-access': 'You don\'t have permission to view this content.',
    'no-files': 'Upload or drag files here to get started.',
    'no-data': 'There is no data to display right now.',
    'coming-soon': 'This feature is currently under development.',
    success: 'Your action was completed successfully.'
  }
  
  return descriptionMap[props.type] || descriptionMap.empty
})

// Compute icon styling based on type
const iconClass = computed(() => {
  const colorMap = {
    empty: 'text-neutral-400',
    'no-results': 'text-neutral-400',
    error: 'text-error-600',
    'no-access': 'text-warning-600',
    'no-files': 'text-primary-600',
    'no-data': 'text-neutral-400',
    'coming-soon': 'text-primary-600',
    success: 'text-success-600'
  }
  
  return colorMap[props.type] || colorMap.empty
})

const iconBackgroundClass = computed(() => {
  const bgMap = {
    empty: 'bg-neutral-100',
    'no-results': 'bg-neutral-100',
    error: 'bg-error-100',
    'no-access': 'bg-warning-100',
    'no-files': 'bg-primary-100',
    'no-data': 'bg-neutral-100',
    'coming-soon': 'bg-primary-100',
    success: 'bg-success-100'
  }
  
  return bgMap[props.type] || bgMap.empty
})
</script>