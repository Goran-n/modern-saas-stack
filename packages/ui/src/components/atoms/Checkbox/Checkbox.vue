<template>
  <div :class="containerClasses">
    <CheckboxRoot
      :id="id"
      :name="name"
      :checked="modelValue"
      :disabled="disabled"
      :required="required"
      :aria-label="ariaLabel || label"
      @update:checked="handleChange"
      :class="checkboxClasses"
    >
      <CheckboxIndicator :class="indicatorClasses">
        <svg
          v-if="!indeterminate"
          class="w-full h-full"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M10 3L4.5 8.5L2 6"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          />
        </svg>
        <svg
          v-else
          class="w-full h-full"
          viewBox="0 0 12 12"
          fill="none"
        >
          <path
            d="M3 6H9"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
          />
        </svg>
      </CheckboxIndicator>
    </CheckboxRoot>
    <label v-if="label" :for="id" :class="labelClasses">{{ label }}</label>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { CheckboxRoot, CheckboxIndicator } from 'reka-ui';
import { cn } from '../../../utils/cn';
import { transitions, focusRing } from '../../../utils/transitions';
import type { CheckboxProps } from './types';

const props = withDefaults(defineProps<CheckboxProps>(), {
  size: 'md',
  color: 'primary',
  disabled: false,
  required: false,
  indeterminate: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'change': [value: boolean];
}>();

const handleChange = (checked: boolean) => {
  emit('update:modelValue', checked);
  emit('change', checked);
};

const containerClasses = computed(() => {
  return cn(
    'inline-flex items-center gap-2',
    props.disabled && 'opacity-50 cursor-not-allowed',
    props.class
  );
});

const sizeClasses = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
};

const colorClasses = computed(() => {
  const colors = {
    primary: {
      checked: 'bg-primary-600 border-primary-600 text-white',
      unchecked: 'bg-white border-neutral-300',
      hover: 'hover:border-primary-500',
    },
    neutral: {
      checked: 'bg-neutral-900 border-neutral-900 text-white',
      unchecked: 'bg-white border-neutral-300',
      hover: 'hover:border-neutral-400',
    },
    error: {
      checked: 'bg-error-600 border-error-600 text-white',
      unchecked: 'bg-white border-error-300',
      hover: 'hover:border-error-500',
    },
  };

  const colorSet = colors[props.color];
  return {
    checked: colorSet.checked,
    unchecked: colorSet.unchecked,
    hover: !props.disabled ? colorSet.hover : '',
  };
});

const checkboxClasses = computed(() => {
  const checked = props.modelValue || props.indeterminate;
  
  return cn(
    'inline-flex items-center justify-center flex-shrink-0',
    'border-2 rounded',
    transitions.base,
    'cursor-pointer',
    focusRing,
    sizeClasses[props.size],
    checked ? colorClasses.value.checked : colorClasses.value.unchecked,
    !props.disabled && colorClasses.value.hover
  );
});

const indicatorClasses = computed(() => {
  return cn(
    'flex items-center justify-center w-full h-full'
  );
});

const labelClasses = computed(() => {
  const textSizes = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-sm',
    lg: 'text-base',
  };

  return cn(
    'select-none cursor-pointer',
    textSizes[props.size],
    props.disabled ? 'text-neutral-400' : 'text-neutral-700'
  );
});
</script>