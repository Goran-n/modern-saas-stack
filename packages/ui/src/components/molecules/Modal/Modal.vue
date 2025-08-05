<template>
  <DialogRoot :open="isOpen" :modal="true" @update:open="handleOpenChange">
    <DialogPortal>
      <!-- Backdrop/Overlay -->
      <DialogOverlay :class="overlayClasses" />
      
      <!-- Modal content -->
      <DialogContent :class="contentClasses">
        <!-- Header -->
        <div v-if="slots?.header || title || description" :class="headerClasses">
          <slot name="header">
            <div class="flex-1">
              <DialogTitle v-if="title" :class="titleClasses">
                {{ title }}
              </DialogTitle>
              <DialogDescription v-if="description" :class="descriptionClasses">
                {{ description }}
              </DialogDescription>
            </div>
          </slot>
          
          <DialogClose
            v-if="closable"
            as-child
          >
            <FigButton
              variant="ghost"
              size="sm"
              color="neutral"
              :aria-label="'Close'"
              class="p-1"
            >
              <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
              </svg>
            </FigButton>
          </DialogClose>
        </div>
        
        <!-- Body -->
        <div :class="bodyClasses">
          <slot name="body">
            <slot />
          </slot>
        </div>
        
        <!-- Footer -->
        <div v-if="slots?.footer" :class="footerClasses">
          <slot name="footer" :close="close" />
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>

<script setup lang="ts">
import { computed, useSlots } from 'vue';
import { 
  DialogRoot, 
  DialogPortal, 
  DialogOverlay, 
  DialogContent, 
  DialogTitle, 
  DialogDescription, 
  DialogClose 
} from 'reka-ui';
import { cn } from '../../../utils/cn';
import { FigButton } from '../../atoms';
import type { ModalProps } from './types';

const props = withDefaults(defineProps<ModalProps>(), {
  size: 'md',
  closable: true,
  closeOnBackdrop: true,
  closeOnEscape: true,
  padding: true,
});

const emit = defineEmits<{
  'update:modelValue': [value: boolean];
  'update:open': [value: boolean];
  'close': [];
}>();

const slots = useSlots();

const close = () => {
  emit('update:modelValue', false);
  emit('update:open', false);
  emit('close');
};

const isOpen = computed(() => props.modelValue ?? props.open ?? false);

const handleOpenChange = (open: boolean) => {
  if (!open) {
    close();
  }
};

// Overlay classes
const overlayClasses = computed(() => {
  return cn(
    'fixed inset-0 z-50',
    'bg-neutral-900/20 backdrop-blur-sm',
    'data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-out'
  );
});

// Content classes
const contentClasses = computed(() => {
  const baseClasses = [
    'fixed left-[50%] top-[50%] z-50',
    'translate-x-[-50%] translate-y-[-50%]',
    'w-full rounded-lg bg-white shadow-xl',
    'data-[state=open]:animate-scale-in data-[state=closed]:animate-scale-out',
  ];
  
  const sizeClasses = {
    xs: 'max-w-xs',
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
    '6xl': 'max-w-6xl',
    '7xl': 'max-w-7xl',
    full: 'max-w-full',
  };
  
  return cn(
    baseClasses,
    sizeClasses[props.size],
    props.class
  );
});

const paddingClasses = props.padding ? 'px-4 py-5 sm:p-6' : '';

const headerClasses = computed(() => {
  const baseClasses = [
    'flex items-start justify-between',
    'border-b border-primary-200',
  ];
  
  return cn(
    baseClasses,
    paddingClasses
  );
});

const bodyClasses = computed(() => {
  return cn(paddingClasses);
});

const footerClasses = computed(() => {
  const baseClasses = [
    'flex items-center justify-end gap-3',
    'border-t border-primary-200',
  ];
  
  return cn(
    baseClasses,
    paddingClasses
  );
});

const titleClasses = computed(() => {
  return 'text-lg font-semibold leading-6 text-primary-900';
});

const descriptionClasses = computed(() => {
  return 'mt-1 text-sm text-primary-600';
});
</script>