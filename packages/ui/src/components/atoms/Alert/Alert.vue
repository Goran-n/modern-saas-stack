<template>
  <div v-if="!dismissed" :class="alertClasses">
    <div v-if="icon || defaultIcon" class="flex-shrink-0">
      <slot name="icon">
        <component :is="iconComponent" :class="iconClasses" />
      </slot>
    </div>
    
    <div class="flex-1">
      <h3 v-if="title" :class="titleClasses">{{ title }}</h3>
      <div v-if="$slots.default || description" :class="descriptionClasses">
        <slot>
          {{ description }}
        </slot>
      </div>
    </div>
    
    <div v-if="dismissible" class="flex-shrink-0 ml-4">
      <FigButton
        variant="ghost"
        size="xs"
        :color="props.color"
        :aria-label="'Dismiss'"
        class="p-1"
        @click="handleDismiss"
      >
        <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
        </svg>
      </FigButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, h } from 'vue';
import { cn } from '../../../utils/cn';
import { transitions } from '../../../utils/transitions';
import { FigButton } from '../Button';
import type { AlertProps } from './types';
import { alertVariants, iconColorVariants } from './variants';

const props = withDefaults(defineProps<AlertProps>(), {
  variant: 'subtle',
  color: 'primary',
  icon: true,
  dismissible: false,
});

const emit = defineEmits<{
  dismiss: [];
}>();

const dismissed = ref(false);

const handleDismiss = () => {
  dismissed.value = true;
  emit('dismiss');
};

const alertClasses = computed(() => {
  const baseClasses = ['flex gap-3 p-4 rounded-lg'];
  
  return cn(
    baseClasses,
    alertVariants[props.variant][props.color],
    transitions.colors,
    props.class
  );
});

const titleClasses = computed(() => {
  return cn(
    'font-medium',
    props.variant === 'solid' ? '' : 'text-primary-900'
  );
});

const descriptionClasses = computed(() => {
  return cn(
    'text-sm',
    props.title ? 'mt-1' : ''
  );
});

const iconClasses = computed(() => {
  const sizeClasses = 'h-5 w-5';
  
  return cn(
    sizeClasses,
    iconColorVariants[props.variant][props.color]
  );
});

// Default icons for different colors
const defaultIcon = computed(() => {
  if (props.icon === false) return false;
  return props.icon === true;
});

const iconComponent = computed(() => {
  const icons = {
    primary: h('svg', { class: 'h-5 w-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
    ]),
    success: h('svg', { class: 'h-5 w-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' })
    ]),
    warning: h('svg', { class: 'h-5 w-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z' })
    ]),
    error: h('svg', { class: 'h-5 w-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z' })
    ]),
    neutral: h('svg', { class: 'h-5 w-5', fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' }, [
      h('path', { 'stroke-linecap': 'round', 'stroke-linejoin': 'round', 'stroke-width': '2', d: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z' })
    ]),
  };
  
  return icons[props.color];
});
</script>