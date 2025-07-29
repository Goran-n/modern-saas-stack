<template>
  <div v-if="orientation === 'horizontal'" :class="horizontalContainerClasses">
    <div :class="lineClasses" />
    <div v-if="label" :class="labelContainerClasses">
      <span :class="labelClasses">{{ label }}</span>
    </div>
    <div v-if="label" :class="lineClasses" />
  </div>
  <div v-else :class="verticalClasses" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '../../../utils/cn';
import type { DividerProps } from './types';

const props = withDefaults(defineProps<DividerProps>(), {
  orientation: 'horizontal',
  position: 'center',
});

const horizontalContainerClasses = computed(() => {
  return cn(
    'flex items-center',
    props.class
  );
});

const verticalClasses = computed(() => {
  return cn(
    'inline-block w-px h-full bg-neutral-200',
    props.class
  );
});

const lineClasses = computed(() => {
  const baseClasses = 'h-px bg-neutral-200';
  
  if (!props.label) {
    return cn(baseClasses, 'w-full');
  }
  
  const flexClasses = {
    left: props.position === 'left' ? 'w-8' : 'flex-1',
    center: 'flex-1',
    right: props.position === 'right' ? 'w-8' : 'flex-1',
  };
  
  return cn(baseClasses, flexClasses[props.position]);
});

const labelContainerClasses = computed(() => {
  return 'flex-shrink-0 px-3';
});

const labelClasses = computed(() => {
  return cn(
    'text-sm text-neutral-500',
    props.labelClass
  );
});
</script>