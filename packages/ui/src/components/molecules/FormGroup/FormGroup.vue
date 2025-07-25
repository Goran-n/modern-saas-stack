<template>
  <div :class="wrapperClasses">
    <div v-if="label || slots?.label" class="flex items-baseline justify-between mb-1.5">
      <label v-if="!slots?.label" :for="fieldId" :class="labelClasses">
        {{ label }}
        <span v-if="required" class="text-error-500 ml-0.5">*</span>
      </label>
      <slot v-else name="label" :for="fieldId" :required="required" />
      
      <span v-if="optional" class="text-xs text-primary-500">
        Optional
      </span>
    </div>
    
    <div v-if="description || slots?.description" :class="descriptionClasses">
      <slot v-if="slots?.description" name="description" />
      <template v-else>{{ description }}</template>
    </div>
    
    <div class="relative">
      <slot :id="fieldId" :error="!!error" :disabled="disabled" />
    </div>
    
    <div v-if="hint || error || slots?.hint || slots?.error" class="mt-1.5">
      <p v-if="error && typeof error === 'string' && !slots?.error" :class="errorClasses">
        {{ error }}
      </p>
      <slot v-else-if="slots?.error && error" name="error" :error="error" />
      
      <p v-else-if="hint && !slots?.hint" :class="hintClasses">
        {{ hint }}
      </p>
      <slot v-else-if="slots?.hint" name="hint" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, useId, useSlots } from 'vue';
import { cn } from '../../../utils/cn';
import type { FormGroupProps } from './types';

const props = withDefaults(defineProps<FormGroupProps>(), {
  required: false,
  optional: false,
  disabled: false,
});

const slots = useSlots();
const fieldId = props.id || useId();

// Wrapper classes
const wrapperClasses = computed(() => cn('w-full', props.class));

// Label classes
const labelClasses = computed(() => [
  'block text-sm font-medium',
  'text-primary-700',
  props.disabled && 'opacity-50',
]);

// Description classes
const descriptionClasses = computed(() => [
  'text-sm text-primary-600 mb-1.5',
  props.disabled && 'opacity-50',
]);

// Hint classes
const hintClasses = computed(() => [
  'text-xs text-primary-500',
  props.disabled && 'opacity-50',
]);

// Error classes
const errorClasses = computed(() => [
  'text-xs text-error-600',
]);
</script>