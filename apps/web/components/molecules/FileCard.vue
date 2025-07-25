<template>
  <FigCard
    variant="elevated"
    padding="none"
    role="button"
    tabindex="0"
    :aria-label="`File: ${displayNameFinal}. ${file.processingStatus === 'failed' ? 'Processing failed. ' : ''}${file.extraction?.extractedFields?.totalAmount?.value ? `Amount: ${file.extraction.extractedFields.totalAmount.value}. ` : ''}Click to view details.`"
    :aria-pressed="false"
    :class="[
      'hover:shadow-md transition-shadow duration-200 group relative cursor-pointer',
      'focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2',
      { 'opacity-50': isDragging }
    ]"
    @click="$emit('select')"
    @keydown.enter.prevent="$emit('select')"
    @keydown.space.prevent="$emit('select')"
  >
    <!-- Action Buttons -->
    <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
      <!-- Reprocess Button -->
      <button
        v-if="showReprocess"
        @click.stop="$emit('reprocess')"
        class="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-primary-500 hover:bg-primary-50 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-1"
        :class="{ 'animate-spin': isReprocessing }"
        :aria-label="`Reprocess ${displayNameFinal}`"
        :disabled="isReprocessing"
      >
        <FigIcon name="i-heroicons-arrow-path" class="text-primary-500" />
      </button>
      
      <!-- Drag Indicator -->
      <div 
        v-if="draggable"
        class="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-primary-500"
      >
        <DragIndicator size="md" color="primary" />
      </div>
    </div>
    
    <div class="aspect-square flex flex-col items-center justify-center p-4">
      <!-- File Icon or Thumbnail -->
      <div class="w-12 h-12 mb-3 flex items-center justify-center">
        <FileIcon :file-name="file.fileName" size="xl" />
      </div>

      <!-- File Name -->
      <h3 
        class="text-sm font-medium text-neutral-900 text-center line-clamp-2 hover:text-primary-600 transition-colors"
        :title="displayNameFinal"
      >
        {{ displayNameFinal }}
      </h3>

      <!-- Supplier Name if available -->
      <p v-if="file.metadata?.supplierName" class="text-xs text-neutral-600 text-center mt-1">
        {{ file.metadata.supplierName }}
      </p>

      <!-- Document Info -->
      <div class="mt-2 text-center space-y-1">
        <!-- Amount if available -->
        <FileAmount 
          v-if="file.extraction?.extractedFields?.totalAmount?.value"
          :amount="file.extraction.extractedFields.totalAmount.value"
          :currency="file.extraction?.extractedFields?.currency?.value"
          size="sm"
          variant="default"
        />
        
        <!-- Document Number if available -->
        <p v-if="file.extraction?.extractedFields?.documentNumber?.value" class="text-xs text-neutral-600">
          #{{ file.extraction.extractedFields.documentNumber.value }}
        </p>

        <!-- Date -->
        <FileDate 
          :date="file.extraction?.extractedFields?.documentDate?.value || file.createdAt" 
          size="xs" 
        />

        <!-- File size -->
        <FileSize :bytes="file.size || 0" size="xs" />
      </div>

      <!-- Processing Status -->
      <div v-if="showStatus" class="mt-2">
        <FileStatus
          :status="file.processingStatus || 'completed'"
          :error-message="undefined"
          :file-name="displayNameFinal"
          size="xs"
          :show-error-details="false"
        />
      </div>

      <!-- Extraction Quality Indicator -->
      <div v-if="showConfidence && file.extraction?.overallConfidence" class="mt-1">
        <FileBadge
          type="confidence"
          :value="file.extraction.overallConfidence"
          size="xs"
        />
      </div>
    </div>
  </FigCard>
</template>

<script setup lang="ts">
import { FigCard, FigIcon } from '@figgy/ui'
import { computed } from 'vue'
import type { FileItem } from '@figgy/types'
import { getFileDisplayName } from '~/utils/fileUtils'
import FileIcon from '../atoms/FileIcon.vue'
import FileDate from '../atoms/FileDate.vue'
import FileSize from '../atoms/FileSize.vue'
import FileBadge from '../atoms/FileBadge.vue'
import DragIndicator from '../atoms/DragIndicator.vue'
import FileAmount from '../atoms/FileAmount.vue'
import FileStatus from '../atoms/FileStatus.vue'

interface Props {
  file: FileItem
  draggable?: boolean
  isDragging?: boolean
  isReprocessing?: boolean
  showReprocess?: boolean
  showStatus?: boolean
  showConfidence?: boolean
}

interface Emits {
  (e: 'select'): void
  (e: 'reprocess'): void
}

const props = withDefaults(defineProps<Props>(), {
  draggable: false,
  isDragging: false,
  isReprocessing: false,
  showReprocess: true,
  showStatus: false,
  showConfidence: false
})

defineEmits<Emits>()

// Get cleaned file name
const displayNameFinal = computed(() => 
  getFileDisplayName(props.file)
)
</script>