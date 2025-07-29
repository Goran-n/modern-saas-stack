<template>
  <label :class="containerClasses">
    <input
      ref="checkboxRef"
      type="checkbox"
      :checked="modelValue"
      :disabled="disabled"
      :required="required"
      :name="name"
      :id="id"
      :aria-label="ariaLabel || label"
      :indeterminate="indeterminate"
      class="sr-only"
      @change="handleChange"
    />
    <span :class="checkboxClasses">
      <svg
        v-if="modelValue && !indeterminate"
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
        v-else-if="indeterminate"
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
    </span>
    <span v-if="label" :class="labelClasses">{{ label }}</span>
  </label>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
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

const checkboxRef = ref<HTMLInputElement>();

// Handle indeterminate state
watch(() => props.indeterminate, (value) => {
  if (checkboxRef.value) {
    checkboxRef.value.indeterminate = value;
  }
}, { immediate: true });

const handleChange = (event: Event) => {
  const target = event.target as HTMLInputElement;
  emit('update:modelValue', target.checked);
  emit('change', target.checked);
};

const containerClasses = computed(() => {
  return cn(
    'inline-flex items-center cursor-pointer',
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
    !props.disabled && focusRing,
    sizeClasses[props.size],
    checked ? colorClasses.value.checked : colorClasses.value.unchecked,
    !props.disabled && colorClasses.value.hover
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
    'ml-2 select-none',
    textSizes[props.size],
    props.disabled ? 'text-neutral-400' : 'text-neutral-700'
  );
});
</script>