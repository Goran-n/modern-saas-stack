<template>
  <div class="flex items-center justify-between w-full gap-4">
    <div class="flex items-center gap-4 min-w-0">
      <FigFileIcon 
        :file-name="file.fileName" 
        size="xl"
        class="flex-shrink-0"
      />
      <div class="min-w-0">
        <h3 class="text-lg font-semibold text-neutral-900 truncate">{{ displayName }}</h3>
        <div class="flex items-center gap-2 text-sm text-neutral-600 mt-1">
          <span v-if="file.metadata?.supplierName" class="truncate">{{ file.metadata.supplierName }}</span>
          <span v-if="file.metadata?.supplierName">•</span>
          <FileSize :bytes="file.size || 0" size="sm" class="flex-shrink-0" />
          <span>•</span>
          <FileDate :date="documentDate || file.createdAt" size="sm" class="flex-shrink-0" />
        </div>
      </div>
    </div>
    
    <div class="flex items-center gap-2 flex-shrink-0">
      <FigButton
        icon="i-heroicons-arrow-down-tray"
        size="sm"
        variant="ghost"
        @click="$emit('download')"
        class="hidden sm:flex"
      >
        Download
      </FigButton>
      <FigButton
        icon="i-heroicons-arrow-down-tray"
        size="sm"
        variant="ghost"
        @click="$emit('download')"
        class="sm:hidden"
        :aria-label="'Download file'"
        title="Download file"
      />
      <FigButton
        v-if="showReprocess"
        icon="i-heroicons-arrow-path"
        size="sm"
        variant="ghost"
        @click="$emit('reprocess')"
        :loading="isReprocessing"
        class="hidden sm:flex"
      >
        Reprocess
      </FigButton>
      <FigButton
        v-if="showReprocess"
        icon="i-heroicons-arrow-path"
        size="sm"
        variant="ghost"
        @click="$emit('reprocess')"
        :loading="isReprocessing"
        class="sm:hidden"
        :aria-label="'Reprocess file'"
        title="Reprocess file"
      />
      <FigButton
        icon="i-heroicons-x-mark"
        size="sm"
        variant="ghost"
        @click="$emit('close')"
        :aria-label="'Close modal'"
        title="Close"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { FileItem } from '@figgy/types'
import { FigButton } from '@figgy/ui'
import { getFileDisplayName } from '~/utils/fileUtils'
import { FigFileIcon } from '@figgy/ui'
import FileDate from '../atoms/FileDate.vue'
import FileSize from '../atoms/FileSize.vue'

interface Props {
  file: FileItem
  isReprocessing?: boolean
}

interface Emits {
  (e: 'download'): void
  (e: 'reprocess'): void
  (e: 'close'): void
}

const props = withDefaults(defineProps<Props>(), {
  isReprocessing: false
})

defineEmits<Emits>()

// Computed
const displayName = computed(() => 
  getFileDisplayName(props.file)
)

const showReprocess = computed(() => 
  props.file.processingStatus !== 'processing'
)

const documentDate = computed(() => 
  props.file.extraction?.extractedFields?.documentDate?.value
)
</script>