<template>
  <div :class="appClasses">
    <slot />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '../../../utils/cn';
import type { AppProps } from './types';

const props = defineProps<AppProps>();

const appClasses = computed(() => {
  return cn(
    'min-h-screen bg-white text-primary-900',
    'antialiased',
    props.class
  );
});
</script>