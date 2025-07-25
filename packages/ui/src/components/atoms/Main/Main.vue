<template>
  <main :class="mainClasses">
    <slot />
  </main>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '../../../utils/cn';
import type { MainProps } from './types';

const props = withDefaults(defineProps<MainProps>(), {
  padding: true,
  fullHeight: false,
});

const mainClasses = computed(() => {
  const baseClasses = ['flex-1'];
  
  const paddingClasses = props.padding ? 'py-6 sm:py-8' : '';
  const heightClasses = props.fullHeight ? 'min-h-screen' : '';
  
  return cn(
    baseClasses,
    paddingClasses,
    heightClasses,
    props.class
  );
});
</script>