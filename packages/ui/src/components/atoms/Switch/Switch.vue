<template>
  <SwitchRoot
    :id="id"
    v-model:checked="checked"
    :disabled="disabled"
    :required="required"
    :class="switchClasses"
  >
    <SwitchThumb :class="thumbClasses" />
  </SwitchRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { SwitchRoot, SwitchThumb } from 'reka-ui';
import { cn } from '../../../utils/cn';
import { focusRing, disabledClasses, transitions } from '../../../utils/transitions';
import type { SwitchProps } from './types';

const props = withDefaults(defineProps<SwitchProps>(), {
  size: 'md',
  color: 'primary',
  disabled: false,
  required: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'change': [value: boolean];
}>();

// v-model support
const checked = computed({
  get: () => props.modelValue || false,
  set: (value) => {
    emit('update:modelValue', value);
    emit('change', value);
  },
});

// Switch classes
const switchClasses = computed(() => {
  const baseClasses = [
    'relative inline-flex items-center',
    'border-2 border-transparent',
    'rounded-full cursor-pointer',
    transitions.base,
    focusRing,
    disabledClasses,
    'data-[state=checked]:bg-current',
  ];

  // Size variants
  const sizeClasses = {
    xs: 'h-4 w-7',
    sm: 'h-5 w-9',
    md: 'h-6 w-11',
    lg: 'h-7 w-[52px]',
    xl: 'h-8 w-[60px]',
  };

  // Color variants
  const colorClasses = {
    primary: [
      'text-primary-500',
      'data-[state=unchecked]:bg-neutral-300',
    ],
    secondary: [
      'text-secondary-500',
      'data-[state=unchecked]:bg-neutral-300',
    ],
    success: [
      'text-success-500',
      'data-[state=unchecked]:bg-neutral-300',
    ],
    warning: [
      'text-warning-500',
      'data-[state=unchecked]:bg-neutral-300',
    ],
    error: [
      'text-error-500',
      'data-[state=unchecked]:bg-neutral-300',
    ],
    neutral: [
      'text-neutral-700',
      'data-[state=unchecked]:bg-neutral-300',
    ],
    info: [
      'text-blue-500',
      'data-[state=unchecked]:bg-neutral-300',
    ],
  };

  return cn(
    baseClasses,
    sizeClasses[props.size],
    colorClasses[props.color],
    props.class
  );
});

// Thumb classes
const thumbClasses = computed(() => {
  const baseClasses = [
    'block bg-white rounded-full shadow-sm',
    transitions.transform,
    'data-[state=checked]:translate-x-full',
  ];

  // Size variants for thumb
  const sizeClasses = {
    xs: 'h-2.5 w-2.5 data-[state=checked]:translate-x-3',
    sm: 'h-3 w-3 data-[state=checked]:translate-x-4',
    md: 'h-4 w-4 data-[state=checked]:translate-x-5',
    lg: 'h-5 w-5 data-[state=checked]:translate-x-6',
    xl: 'h-6 w-6 data-[state=checked]:translate-x-7',
  };

  return cn(baseClasses, sizeClasses[props.size]);
});
</script>