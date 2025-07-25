<template>
  <div :class="containerClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '../../../utils/cn';
import type { ContainerProps } from './types';

const props = withDefaults(defineProps<ContainerProps>(), {
  maxWidth: 'xl',
  padding: true,
});

const containerClasses = computed(() => {
  const baseClasses = ['w-full mx-auto'];
  
  // Max width variants
  const maxWidthClasses = {
    xs: 'max-w-xs', // 320px
    sm: 'max-w-sm', // 384px
    md: 'max-w-md', // 448px
    lg: 'max-w-lg', // 512px
    xl: 'max-w-xl', // 576px
    '2xl': 'max-w-2xl', // 672px
    '3xl': 'max-w-3xl', // 768px
    '4xl': 'max-w-4xl', // 896px
    '5xl': 'max-w-5xl', // 1024px
    '6xl': 'max-w-6xl', // 1152px
    '7xl': 'max-w-7xl', // 1280px
    full: 'max-w-full',
    prose: 'max-w-prose', // 65ch
    screen: 'max-w-screen-xl',
  };
  
  // Padding
  const paddingClasses = props.padding ? 'px-4 sm:px-6 lg:px-8' : '';
  
  return cn(
    baseClasses,
    maxWidthClasses[props.maxWidth],
    paddingClasses,
    props.class
  );
});
</script>