<template>
  <BaseButton
    v-bind="$attrs"
    :disabled="loading || disabled"
    :class="className"
  >
    <span class="flex items-center justify-center">
      <!-- Loading spinner -->
      <span v-if="loading" class="mr-2">
        <svg
          class="animate-spin h-4 w-4"
          :class="spinnerColorClass"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            class="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            stroke-width="4"
          />
          <path
            class="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </span>
      
      <!-- Icon slot -->
      <span v-if="$slots.icon && !loading" class="mr-2">
        <slot name="icon" />
      </span>
      
      <!-- Button text -->
      <span>
        <slot>
          {{ loading ? loadingText : text }}
        </slot>
      </span>
    </span>
  </BaseButton>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BaseButton from './BaseButton.vue'

export interface LoadingButtonProps {
  loading?: boolean
  disabled?: boolean
  text?: string
  loadingText?: string
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
  spinnerColor?: 'white' | 'primary' | 'current'
  class?: string | string[] | Record<string, boolean>
}

const props = withDefaults(defineProps<LoadingButtonProps>(), {
  loading: false,
  disabled: false,
  text: 'Submit',
  loadingText: 'Loading...',
  variant: 'primary',
  spinnerColor: 'white'
})

const spinnerColorClass = computed(() => {
  switch (props.spinnerColor) {
    case 'white':
      return 'text-white'
    case 'primary':
      return 'text-primary-600'
    case 'current':
    default:
      return 'text-current'
  }
})

const className = computed(() => props.class)
</script>