<template>
  <component
    :is="Component"
    :class="buttonClasses"
    :disabled="disabled || loading"
    v-bind="forwarded"
  >
    <span v-if="loading" class="absolute inset-0 flex items-center justify-center">
      <FigSpinner :size="spinnerSize" />
    </span>
    <span :class="contentClasses">
      <slot />
    </span>
  </component>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Primitive } from 'reka-ui';
import { cn } from '../../../utils/cn';
import { transitions, focusRing, disabledClasses } from '../../../utils/transitions';
import type { ButtonProps } from './types';
import { buttonVariants, buttonSizes } from './variants';
import FigSpinner from '../Spinner/Spinner.vue';

const props = withDefaults(defineProps<ButtonProps>(), {
  variant: 'solid',
  size: 'md',
  color: 'primary',
  type: 'button',
  loading: false,
  disabled: false,
});

const buttonRef = ref<HTMLElement>();

// Component to render
const Component = computed(() => {
  return props.asChild ? Primitive : 'button';
});

// Forward all non-prop attributes
const forwarded = computed(() => {
  if (props.asChild) {
    return {
      asChild: true,
    };
  }
  return {
    type: props.type,
    ref: buttonRef,
    'aria-label': props.ariaLabel,
  };
});

// Button style classes
const buttonClasses = computed(() => {
  const baseClasses = [
    'inline-flex items-center justify-center',
    'font-medium',
    transitions.base,
    focusRing,
    disabledClasses,
    'active:scale-95',
    'cursor-pointer',
    'relative',
  ];

  return cn(
    baseClasses,
    buttonSizes[props.size],
    buttonVariants[props.variant][props.color],
    props.class
  );
});

// Content classes for loading state
const contentClasses = computed(() => ({
  'opacity-0': props.loading,
  'opacity-100': !props.loading,
}));

// Spinner size based on button size
const spinnerSize = computed(() => {
  const sizeMap = {
    xs: 'xs',
    sm: 'sm',
    md: 'sm',
    lg: 'md',
    xl: 'lg',
  } as const;
  return sizeMap[props.size];
});
</script>