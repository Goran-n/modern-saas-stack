<template>
  <Teleport to="body">
    <Transition
      enter-active-class="transition-opacity duration-150 ease-out"
      enter-from-class="opacity-0"
      enter-to-class="opacity-100"
      leave-active-class="transition-opacity duration-150 ease-out"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div v-if="modelValue" class="fixed inset-0 z-50 overflow-y-auto">
        <!-- Backdrop -->
        <div 
          class="fixed inset-0 bg-primary-900 bg-opacity-75 transition-opacity duration-150 ease-out"
          @click="handleBackdropClick"
        />
        
        <!-- Modal container -->
        <div class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0">
          <Transition
            enter-active-class="transition-all duration-150 ease-out"
            enter-from-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
            enter-to-class="opacity-100 translate-y-0 sm:scale-100"
            leave-active-class="transition-all duration-150 ease-out"
            leave-from-class="opacity-100 translate-y-0 sm:scale-100"
            leave-to-class="opacity-0 translate-y-4 sm:translate-y-0 sm:scale-95"
          >
            <div
              v-if="modelValue"
              ref="modalRef"
              :class="modalClasses"
              role="dialog"
              aria-modal="true"
              :aria-labelledby="titleId"
              :aria-describedby="bodyId"
              @click.stop
            >
              <!-- Header -->
              <div v-if="slots?.header || title" :class="headerClasses">
                <slot name="header">
                  <h3 :id="titleId" class="text-lg font-semibold leading-6 text-primary-900">
                    {{ title }}
                  </h3>
                </slot>
                
                <FigButton
                  v-if="closable"
                  variant="ghost"
                  size="sm"
                  color="neutral"
                  :aria-label="'Close'"
                  class="p-1"
                  @click="close"
                >
                  <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" />
                  </svg>
                </FigButton>
              </div>
              
              <!-- Body -->
              <div :id="bodyId" :class="bodyClasses">
                <slot />
              </div>
              
              <!-- Footer -->
              <div v-if="slots?.footer" :class="footerClasses">
                <slot name="footer" />
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onMounted, onUnmounted, useSlots, ref, nextTick, useId, toRef } from 'vue';
import { cn } from '../../../utils/cn';
// Removed unused import
import { useBodyScrollLock } from '../../../composables';
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
  'close': [];
}>();

const slots = useSlots();
const modalRef = ref<HTMLElement>();
const titleId = useId();
const bodyId = useId();

const close = () => {
  emit('update:modelValue', false);
  emit('close');
};

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    close();
  }
};

const handleEscape = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && props.closeOnEscape && props.modelValue) {
    close();
  }
};

// Focus trap functionality
const lastFocusedElement = ref<HTMLElement | null>(null);

const getFocusableElements = () => {
  if (!modalRef.value) return [];
  
  const selectors = [
    'a[href]',
    'button:not([disabled])',
    'textarea:not([disabled])',
    'input[type="text"]:not([disabled])',
    'input[type="radio"]:not([disabled])',
    'input[type="checkbox"]:not([disabled])',
    'select:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(',');
  
  return Array.from(modalRef.value.querySelectorAll(selectors)) as HTMLElement[];
};

const trapFocus = (e: KeyboardEvent) => {
  if (e.key !== 'Tab' || !props.modelValue) return;
  
  const elements = getFocusableElements();
  if (elements.length === 0) return;
  
  const firstElement = elements[0];
  const lastElement = elements[elements.length - 1];
  
  if (e.shiftKey && document.activeElement === firstElement) {
    e.preventDefault();
    lastElement.focus();
  } else if (!e.shiftKey && document.activeElement === lastElement) {
    e.preventDefault();
    firstElement.focus();
  }
};

// Use body scroll lock composable
useBodyScrollLock(toRef(props, 'modelValue'));

// Manage focus when modal is open
watch(() => props.modelValue, async (isOpen) => {
  if (isOpen) {
    // Store the currently focused element
    lastFocusedElement.value = document.activeElement as HTMLElement;
    
    // Wait for DOM update
    await nextTick();
    
    // Focus the first focusable element in the modal
    const elements = getFocusableElements();
    if (elements.length > 0) {
      elements[0].focus();
    }
    
    // Add focus trap listener
    document.addEventListener('keydown', trapFocus);
  } else {
    // Remove focus trap listener
    document.removeEventListener('keydown', trapFocus);
    
    // Restore focus to the previously focused element
    if (lastFocusedElement.value) {
      lastFocusedElement.value.focus();
    }
  }
});

// Handle escape key
onMounted(() => {
  if (props.closeOnEscape) {
    window.addEventListener('keydown', handleEscape);
  }
});

onUnmounted(() => {
  if (props.closeOnEscape) {
    window.removeEventListener('keydown', handleEscape);
  }
  // Clean up focus trap
  document.removeEventListener('keydown', trapFocus);
  // Clean up body overflow
  document.body.style.overflow = '';
});

const modalClasses = computed(() => {
  const baseClasses = [
    'relative transform overflow-hidden rounded-lg',
    'bg-white',
    'text-left shadow-xl transition-all',
    'sm:my-8 w-full',
  ];
  
  const sizeClasses = {
    xs: 'sm:max-w-xs',
    sm: 'sm:max-w-sm',
    md: 'sm:max-w-md',
    lg: 'sm:max-w-lg',
    xl: 'sm:max-w-xl',
    '2xl': 'sm:max-w-2xl',
    '3xl': 'sm:max-w-3xl',
    '4xl': 'sm:max-w-4xl',
    '5xl': 'sm:max-w-5xl',
    '6xl': 'sm:max-w-6xl',
    '7xl': 'sm:max-w-7xl',
    full: 'sm:max-w-full',
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
</script>