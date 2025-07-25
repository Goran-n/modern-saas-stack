<template>
  <div :class="containerClasses">
    <label
      v-if="label || $slots.label"
      :for="inputId"
      :class="labelClasses"
    >
      <slot name="label">{{ label }}</slot>
      <span v-if="required" class="text-error-500 ml-1">*</span>
    </label>
    
    <div :class="inputContainerClasses">
      <slot :id="inputId" />
    </div>
    
    <p v-if="hint && !error" :class="hintClasses">
      {{ hint }}
    </p>
    
    <p v-if="error" :class="errorClasses">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
import { computed, useId } from 'vue'
import { cn } from '../../../utils/cn'
import type { FormFieldProps } from './types'

const props = withDefaults(defineProps<FormFieldProps>(), {
  required: false,
  disabled: false,
})

const inputId = useId()

const containerClasses = computed(() => {
  return cn(
    'space-y-1.5',
    props.class
  )
})

const labelClasses = computed(() => {
  return cn(
    'block text-sm font-medium text-neutral-700',
    props.disabled && 'text-neutral-400',
    props.labelClass
  )
})

const inputContainerClasses = computed(() => {
  return 'relative'
})

const hintClasses = computed(() => {
  return cn(
    'text-sm text-neutral-500',
    props.disabled && 'text-neutral-400'
  )
})

const errorClasses = computed(() => {
  return 'text-sm text-error-600'
})
</script>