<template>
  <div :class="containerClasses">
    <!-- Label -->
    <label
      v-if="label || $slots.label"
      :for="fieldId"
      :class="labelClasses"
      class="block text-sm font-medium mb-1.5"
    >
      <slot name="label">
        {{ label }}
        <span
          v-if="required"
          class="text-error-500 ml-1"
        >*</span>
      </slot>
    </label>

    <!-- Field description -->
    <p
      v-if="description || $slots.description"
      :class="descriptionClasses"
      class="text-2xs mb-2"
    >
      <slot name="description">
        {{ description }}
      </slot>
    </p>

    <!-- Input field slot -->
    <div class="relative">
      <slot 
        :id="fieldId" 
        :error-message="errorMessage"
        :has-error="hasError"
      />
    </div>

    <!-- Error message -->
    <div
      v-if="hasError"
      class="mt-1.5 flex items-start space-x-1"
    >
      <ExclamationCircleIcon class="h-4 w-4 text-error-500 flex-shrink-0 mt-0.5" />
      <p class="text-2xs text-error-600">
        <slot name="error">
          {{ errorMessage }}
        </slot>
      </p>
    </div>

    <!-- Helper text -->
    <p
      v-else-if="helperText || $slots.help"
      class="mt-1.5 text-2xs text-neutral-500"
    >
      <slot name="help">
        {{ helperText }}
      </slot>
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, provide } from 'vue'
import { ExclamationCircleIcon } from '@heroicons/vue/20/solid'
import { FormFieldKey } from './types'

// Component props
interface Props {
  label?: string
  description?: string
  helperText?: string
  errorMessage?: string
  required?: boolean
  id?: string
  size?: 'sm' | 'md' | 'lg'
}

const props = withDefaults(defineProps<Props>(), {
  required: false,
  size: 'md',
})

// Computed properties
const fieldId = computed(() => props.id || `field-${Math.random().toString(36).substring(7)}`)

const hasError = computed(() => Boolean(props.errorMessage))

const containerClasses = computed(() => {
  const baseClasses = ['form-field']
  
  // Add spacing based on size
  switch (props.size) {
    case 'sm':
      baseClasses.push('space-y-1')
      break
    case 'lg':
      baseClasses.push('space-y-2')
      break
    default:
      baseClasses.push('space-y-1.5')
  }
  
  return baseClasses.join(' ')
})

const labelClasses = computed(() => {
  const baseClasses = ['text-neutral-900']
  
  if (hasError.value) {
    baseClasses.push('text-error-700')
  }
  
  return baseClasses.join(' ')
})

const descriptionClasses = computed(() => {
  return 'text-neutral-600'
})

// Provide field context for child components
provide(FormFieldKey, {
  fieldId,
  hasError,
  errorMessage: computed(() => props.errorMessage),
  required: computed(() => props.required),
})
</script>

<style scoped>
.form-field {
  /* Custom form field styles can go here */
}
</style>