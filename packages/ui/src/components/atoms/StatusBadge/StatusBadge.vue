<template>
  <FigBadge
    :variant="computedVariant"
    :color="computedColor"
    :size="size"
    :icon="showIcon ? computedIcon?.icon : undefined"
    :icon-animation="showIcon ? computedIcon?.animation : undefined"
    v-bind="$attrs"
  >
    <slot>{{ displayText }}</slot>
  </FigBadge>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import FigBadge from '../Badge/Badge.vue';
import type { StatusBadgeProps } from './types';
import { getStatusColor, getStatusDisplayText, getStatusIcon } from './utils';

const props = withDefaults(defineProps<StatusBadgeProps>(), {
  variant: 'soft',
  size: 'md',
  showIcon: true,
});

const computedColor = computed(() => {
  if (props.color) return props.color;
  return getStatusColor(props.status, props.type);
});

const computedVariant = computed(() => {
  return props.variant;
});

const displayText = computed(() => {
  if (props.displayText) return props.displayText;
  return getStatusDisplayText(props.status);
});

const computedIcon = computed(() => {
  if (!props.showIcon) return undefined;
  return getStatusIcon(props.status);
});
</script>