<template>
  <div :class="avatarClasses" role="img" :aria-label="effectiveAlt">
    <img 
      v-if="props.src && !imageError" 
      :src="props.src" 
      :alt="effectiveAlt"
      class="w-full h-full object-cover"
      @error="handleImageError"
    />
    <div v-else class="flex items-center justify-center w-full h-full" aria-hidden="true">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { cn } from '../../../utils/cn';
import type { AvatarProps } from './types';

const props = withDefaults(defineProps<AvatarProps>(), {
  size: 'md',
});

const imageError = ref(false);

// Computed effective alt text
const effectiveAlt = computed(() => {
  return props.alt;
});

// Handle image loading errors
const handleImageError = () => {
  imageError.value = true;
};

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
</script>