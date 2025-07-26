<template>
  <Component
    :is="props.as || 'span'"
    :class="iconClasses"
    :role="props.ariaLabel ? 'img' : undefined"
    :aria-label="props.ariaLabel"
    :aria-hidden="!props.ariaLabel ? 'true' : undefined"
    v-bind="$attrs"
  >
    <!-- Render icon if name is provided -->
    <Icon 
      v-if="props.name" 
      :icon="props.name" 
      :class="iconSizeClasses"
    />
    <!-- Fallback to slot content -->
    <slot v-else />
  </Component>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@iconify/vue';
import { cn } from '../../../utils/cn';
import type { IconProps } from './types';

const props = withDefaults(defineProps<IconProps>(), {
  size: 'md',
  as: 'span'
});

// Size mapping for container
const sizeMap = {
  xs: 'h-3 w-3',
  sm: 'h-4 w-4',
  md: 'h-5 w-5',
  lg: 'h-6 w-6',
  xl: 'h-8 w-8'
};

// Size mapping for the actual icon
const iconSizeMap = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-5 h-5',
  lg: 'w-6 h-6',
  xl: 'w-8 h-8'
};

const iconClasses = computed(() => {
  return cn(
    'inline-flex shrink-0 items-center justify-center',
    sizeMap[props.size],
    props.class
  );
});

const iconSizeClasses = computed(() => {
  return iconSizeMap[props.size];
});
</script>