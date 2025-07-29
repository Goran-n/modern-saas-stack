<template>
  <article 
    :class="cardClasses"
    :role="role"
    :aria-label="ariaLabel"
  >
    <header v-if="slots?.header || header" :class="headerClasses">
      <slot name="header">
        <component 
          :is="headerTag" 
          v-if="header" 
          class="text-lg font-semibold text-neutral-900"
        >
          {{ header }}
        </component>
      </slot>
    </header>
    
    <div :class="bodyClasses">
      <slot />
    </div>
    
    <footer v-if="slots?.footer" :class="footerClasses">
      <slot name="footer" />
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { cn } from '../../../utils/cn';
import { transitions } from '../../../utils/transitions';
import type { CardProps } from './types';

const props = withDefaults(defineProps<CardProps>(), {
  variant: 'flat',
  padding: 'md',
  rounded: true,
  headerTag: 'h3',
});

const slots = useSlots();

const cardClasses = computed(() => {
  const baseClasses = ['overflow-hidden', transitions.base];
  
  // Variant styles
  const variantClasses = {
    flat: 'bg-white',
    elevated: 'bg-white shadow-sm',
    outlined: 'bg-white border border-neutral-200',
  };
  
  // Rounded corners
  const roundedClasses = props.rounded ? 'rounded-lg' : '';
  
  return cn(
    baseClasses,
    variantClasses[props.variant],
    roundedClasses,
    props.class
  );
});

const paddingMap = {
  none: '',
  xs: 'px-3 py-2',
  sm: 'px-4 py-3',
  md: 'px-6 py-4',
  lg: 'px-8 py-6',
  xl: 'px-10 py-8',
};

const headerClasses = computed(() => {
  const baseClasses = ['border-b border-neutral-200'];
  
  return cn(
    baseClasses,
    paddingMap[props.padding]
  );
});

const bodyClasses = computed(() => {
  return cn(paddingMap[props.padding]);
});

const footerClasses = computed(() => {
  const baseClasses = ['border-t border-neutral-200'];
  
  return cn(
    baseClasses,
    paddingMap[props.padding]
  );
});
</script>