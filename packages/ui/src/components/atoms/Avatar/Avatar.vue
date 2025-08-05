<template>
  <AvatarRoot :class="avatarClasses">
    <AvatarImage 
      v-if="src"
      :src="src" 
      :alt="alt"
      :class="imageClasses"
    />
    <AvatarFallback :class="fallbackClasses">
      <slot />
    </AvatarFallback>
  </AvatarRoot>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { AvatarRoot, AvatarImage, AvatarFallback } from 'reka-ui';
import { cn } from '../../../utils/cn';
import type { AvatarProps } from './types';

const props = withDefaults(defineProps<AvatarProps>(), {
  size: 'md',
});

// Size mapping
const sizeMap = {
  xs: 'h-6 w-6 text-xs',
  sm: 'h-8 w-8 text-sm',
  md: 'h-10 w-10 text-base',
  lg: 'h-12 w-12 text-lg',
  xl: 'h-14 w-14 text-xl',
  '2xl': 'h-16 w-16 text-2xl'
};

const avatarClasses = computed(() => {
  return cn(
    'relative inline-flex items-center justify-center overflow-hidden rounded-full',
    'bg-primary-100',
    sizeMap[props.size],
    props.class
  );
});

const imageClasses = computed(() => {
  return 'w-full h-full object-cover';
});

const fallbackClasses = computed(() => {
  return 'flex items-center justify-center w-full h-full';
});
</script>