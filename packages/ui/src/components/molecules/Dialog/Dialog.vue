<template>
  <FigModal
    v-model="isOpen"
    v-bind="modalProps"
    :class="dialogClasses"
  >
    <template v-if="$slots.header" #header>
      <slot name="header" />
    </template>
    
    <template v-else-if="title || description" #header>
      <div class="space-y-1">
        <h3 :class="titleClasses">{{ title }}</h3>
        <p v-if="description" :class="descriptionClasses">{{ description }}</p>
      </div>
    </template>
    
    <slot />
    
    <template v-if="$slots.footer" #footer>
      <slot name="footer" :close="close" />
    </template>
  </FigModal>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { FigModal } from '../Modal';
import { cn } from '../../../utils/cn';
import type { DialogProps } from './types';

const props = withDefaults(defineProps<DialogProps>(), {
  type: 'default',
  size: 'md',
  closable: true,
  closeOnBackdrop: true,
  closeOnEscape: true,
  padding: true,
  loading: false,
});

const emit = defineEmits<{
  'update:open': [value: boolean];
  'close': [];
}>();

const isOpen = computed({
  get: () => props.open ?? false,
  set: (value) => {
    emit('update:open', value);
    if (!value) {
      emit('close');
    }
  },
});

const close = () => {
  isOpen.value = false;
};

// Pass through all props except 'open' and dialog-specific ones
const modalProps = computed(() => {
  const { open, description, type, loading, ...rest } = props;
  return rest;
});

const dialogClasses = computed(() => {
  const typeClasses = {
    default: '',
    danger: 'fig-dialog--danger',
    warning: 'fig-dialog--warning', 
    success: 'fig-dialog--success',
  };
  
  return cn(
    'fig-dialog',
    typeClasses[props.type],
    props.loading && 'fig-dialog--loading'
  );
});

const titleClasses = computed(() => {
  const typeClasses = {
    default: 'text-primary-900',
    danger: 'text-error-700',
    warning: 'text-warning-700',
    success: 'text-success-700',
  };
  
  return cn(
    'text-lg font-semibold leading-6',
    typeClasses[props.type]
  );
});

const descriptionClasses = computed(() => {
  return 'text-sm text-primary-600';
});
</script>

<style scoped>
.fig-dialog--danger :deep(.bg-white) {
  border-top-width: 4px;
  border-top-color: rgb(var(--color-error-500));
}

.fig-dialog--warning :deep(.bg-white) {
  border-top-width: 4px;
  border-top-color: rgb(var(--color-warning-500));
}

.fig-dialog--success :deep(.bg-white) {
  border-top-width: 4px;
  border-top-color: rgb(var(--color-success-500));
}

.fig-dialog--loading {
  pointer-events: none;
}

.fig-dialog--loading :deep(.bg-white) {
  opacity: 0.75;
}
</style>