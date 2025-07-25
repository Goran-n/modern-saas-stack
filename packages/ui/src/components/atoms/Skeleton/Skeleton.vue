<template>
  <div :class="skeletonClasses" />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '../../../utils/cn';
import type { SkeletonProps } from './types';

const props = withDefaults(defineProps<SkeletonProps>(), {
  height: 'md',
  width: 'full',
  rounded: true,
  animate: true,
});

const skeletonClasses = computed(() => {
  const baseClasses = ['bg-primary-200'];
  
  // Height classes
  const heightMap: Record<string, string> = {
    xs: 'h-3',
    sm: 'h-4',
    md: 'h-6',
    lg: 'h-8',
    xl: 'h-12',
    full: 'h-full',
  };
  
  // Width classes
  const widthMap: Record<string, string> = {
    xs: 'w-16',
    sm: 'w-24',
    md: 'w-32',
    lg: 'w-48',
    xl: 'w-64',
    full: 'w-full',
  };
  
  const heightClass = heightMap[props.height] || props.height;
  const widthClass = widthMap[props.width] || props.width;
  
  const roundedClass = props.rounded ? 'rounded-md' : '';
  const animateClass = props.animate ? 'animate-pulse' : '';
  
  return cn(
    baseClasses,
    heightClass,
    widthClass,
    roundedClass,
    animateClass,
    props.class
  );
});
</script>