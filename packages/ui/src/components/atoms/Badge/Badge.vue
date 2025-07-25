<template>
  <span 
    :class="badgeClasses"
    role="status"
    :aria-label="ariaLabel"
  >
    <span v-if="icon" :class="iconClasses" aria-hidden="true">
      <i :class="icon" />
    </span>
    <slot />
    <span v-if="trailingIcon" :class="trailingIconClasses" aria-hidden="true">
      <i :class="trailingIcon" />
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { cn } from '../../../utils/cn';
import { transitions } from '../../../utils/transitions';
import type { BadgeProps } from './types';
import { badgeVariants, badgeSizes } from './variants';

const props = withDefaults(defineProps<BadgeProps>(), {
  variant: 'solid',
  size: 'md',
  color: 'neutral',
  iconAnimation: 'none',
});

const badgeClasses = computed(() => {
  const baseClasses = [
    'inline-flex items-center justify-center gap-1.5',
    'font-medium',
    transitions.base,
  ];

  return cn(
    baseClasses,
    badgeSizes[props.size],
    badgeVariants[props.variant][props.color],
    props.class
  );
});

const iconClasses = computed(() => {
  const classes = ['inline-flex items-center'];
  
  if (props.iconAnimation === 'spin') {
    classes.push('animate-spin');
  } else if (props.iconAnimation === 'pulse') {
    classes.push('animate-pulse');
  }
  
  return classes;
});

const trailingIconClasses = computed(() => {
  return ['inline-flex items-center'];
});
</script>