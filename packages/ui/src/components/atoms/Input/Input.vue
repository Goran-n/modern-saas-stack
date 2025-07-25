<template>
  <div class="relative">
    <div v-if="slots?.leading" class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
      <slot name="leading" />
    </div>
    
    <input
      :id="id"
      ref="inputRef"
      v-model="modelValue"
      :type="type"
      :placeholder="placeholder"
      :disabled="disabled"
      :readonly="readonly"
      :required="required"
      :class="inputClasses"
      :aria-invalid="error"
      v-bind="$attrs"
      @input="handleInput"
      @blur="handleBlur"
      @focus="handleFocus"
    />
    
    <div v-if="slots?.trailing || clearable" class="absolute inset-y-0 right-0 flex items-center pr-3">
      <button
        v-if="clearable && modelValue"
        type="button"
        class="text-neutral-400 hover:text-neutral-600 transition-colors duration-150 ease-out"
        aria-label="Clear input"
        @click="handleClear"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      <slot name="trailing" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, useSlots } from 'vue';
import { cn } from '../../../utils/cn';
import { transitions, focusRing, disabledClasses } from '../../../utils/transitions';
import type { InputProps } from './types';

const props = withDefaults(defineProps<InputProps>(), {
  type: 'text',
  size: 'md',
  variant: 'outline',
  disabled: false,
  readonly: false,
  required: false,
  clearable: false,
  error: false,
});

const emit = defineEmits<{
  'update:modelValue': [value: string];
  'input': [event: Event];
  'blur': [event: FocusEvent];
  'focus': [event: FocusEvent];
  'clear': [];
}>();

const slots = useSlots();
const inputRef = ref<HTMLInputElement>();

// v-model support
const modelValue = computed({
  get: () => props.modelValue || '',
  set: (value) => emit('update:modelValue', value),
});

// Input classes
const inputClasses = computed(() => {
  const baseClasses = [
    'block w-full',
    transitions.base,
    'placeholder:text-neutral-400',
    disabledClasses,
    focusRing,
  ];

  // Size variants
  const sizeClasses = {
    xs: 'h-7 px-2.5 text-xs rounded-md',
    sm: 'h-8 px-3 text-sm rounded-md',
    md: 'h-10 px-4 text-sm rounded-lg',
    lg: 'h-11 px-5 text-base rounded-lg',
    xl: 'h-12 px-6 text-base rounded-lg',
  };

  // Variant classes
  const variantClasses = {
    outline: [
      'border',
      props.error
        ? 'border-error-500 text-error-900'
        : 'border-neutral-300 text-neutral-900 focus:border-primary-500',
      'bg-white',
    ],
    filled: [
      'border border-transparent',
      props.error
        ? 'bg-error-50 text-error-900'
        : 'bg-neutral-100 text-neutral-900',
    ],
    underline: [
      'border-b-2 rounded-none px-0',
      props.error
        ? 'border-error-500 text-error-900 focus:border-error-600'
        : 'border-neutral-300 text-neutral-900 focus:border-primary-500',
      'bg-transparent',
    ],
  };

  // Adjust padding for leading/trailing slots
  const paddingClasses = [];
  if (slots?.leading) paddingClasses.push('pl-10');
  if (slots?.trailing || props.clearable) paddingClasses.push('pr-10');

  return cn(
    baseClasses,
    sizeClasses[props.size],
    variantClasses[props.variant],
    paddingClasses,
    props.class
  );
});

// Event handlers
const handleInput = (event: Event) => {
  emit('input', event);
};

const handleBlur = (event: FocusEvent) => {
  emit('blur', event);
};

const handleFocus = (event: FocusEvent) => {
  emit('focus', event);
};

const handleClear = () => {
  modelValue.value = '';
  emit('clear');
  inputRef.value?.focus();
};

// Expose focus method
defineExpose({
  focus: () => inputRef.value?.focus(),
  blur: () => inputRef.value?.blur(),
});
</script>