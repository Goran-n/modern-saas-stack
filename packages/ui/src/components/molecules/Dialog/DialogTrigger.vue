<template>
  <div :class="cn('inline-flex', props.class)">
    <slot :props="slotProps" />
  </div>
</template>

<script setup lang="ts">
import { inject, computed } from 'vue';
import { cn } from '../../../utils/cn';
import type { DialogTriggerProps } from './types';
import { dialogInjectionKey } from './constants';

const props = defineProps<DialogTriggerProps>();

const dialog = inject(dialogInjectionKey);

const slotProps = computed(() => ({
  onClick: () => {
    if (!props.disabled && dialog) {
      dialog.open();
    }
  },
  'aria-haspopup': 'dialog',
  'aria-expanded': dialog?.isOpen.value ?? false,
  disabled: props.disabled,
}));
</script>