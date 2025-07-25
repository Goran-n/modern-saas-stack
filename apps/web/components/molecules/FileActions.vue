<template>
  <div class="flex items-center gap-2">
    <FigButton
      v-if="showView"
      icon="i-heroicons-eye"
      :size="size"
      variant="ghost"
      @click="$emit('view')"
    >
      <span v-if="showLabels">View</span>
    </FigButton>
    
    <FigButton
      v-if="showDownload"
      icon="i-heroicons-arrow-down-tray"
      :size="size"
      variant="ghost"
      @click="$emit('download')"
    >
      <span v-if="showLabels">Download</span>
    </FigButton>
    
    <FigButton
      v-if="showReprocess"
      icon="i-heroicons-arrow-path"
      :size="size"
      variant="ghost"
      :loading="loading"
      @click="$emit('reprocess')"
    >
      <span v-if="showLabels">Reprocess</span>
    </FigButton>
    
    <FigButton
      v-if="showDelete"
      icon="i-heroicons-trash"
      :size="size"
      variant="ghost"
      @click="$emit('delete')"
    >
      <span v-if="showLabels">Delete</span>
    </FigButton>
    
    <slot />
  </div>
</template>

<script setup lang="ts">
import { FigButton } from '@figgy/ui'

interface Props {
  size?: 'xs' | 'sm' | 'md' | 'lg'
  showView?: boolean
  showDownload?: boolean
  showReprocess?: boolean
  showDelete?: boolean
  showLabels?: boolean
  loading?: boolean
}

interface Emits {
  (e: 'view'): void
  (e: 'download'): void
  (e: 'reprocess'): void
  (e: 'delete'): void
}

withDefaults(defineProps<Props>(), {
  size: 'sm',
  showView: true,
  showDownload: true,
  showReprocess: true,
  showDelete: false,
  showLabels: true,
  loading: false
})

defineEmits<Emits>()
</script>