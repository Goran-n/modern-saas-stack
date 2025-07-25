<template>
  <tr class="hover:bg-gray-50 transition-colors">
    <!-- File Name & Info Column -->
    <td class="px-4 py-3">
      <div class="flex items-center gap-3">
        <FileIcon 
          :file-name="file.fileName" 
          size="lg"
        />
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium text-gray-900 truncate" :title="displayNameFinal">
            {{ displayNameFinal }}
          </div>
          <div class="space-y-0.5">
            <div v-if="file.metadata?.supplierName" class="text-xs text-gray-600">
              {{ file.metadata.supplierName }}
            </div>
            <div class="flex items-center gap-2 text-xs text-gray-500">
              <FileSize :bytes="file.size || 0" size="xs" />
              <span v-if="props.totalAmount" class="font-medium">
                • {{ props.totalAmount }}
              </span>
              <span v-if="props.documentNumber">
                • #{{ props.documentNumber }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </td>

    <!-- Status Column -->
    <td class="px-4 py-3">
      <div class="flex items-center gap-2">
        <FileBadge
          type="status"
          :value="file.processingStatus || 'completed'"
          status-type="processing"
          variant="soft"
          size="xs"
        />
        
        <!-- Extraction Confidence -->
        <FileBadge
          v-if="file.extraction?.overallConfidence"
          type="confidence"
          :value="file.extraction.overallConfidence"
          size="xs"
        />
      </div>
    </td>

    <!-- Date Column -->
    <td class="px-4 py-3">
      <FileDate 
        :date="props.documentDate || file.createdAt" 
        :show-time="!documentDate"
        size="sm"
        layout="stacked"
      />
    </td>

    <!-- Actions Column -->
    <td class="px-4 py-3 text-right">
      <div class="flex items-center justify-end gap-2">
        <FigButton
          icon="i-heroicons-eye"
          size="sm"
          variant="ghost"
          @click="$emit('view')"
        >
          View
        </FigButton>
        <FigButton
          icon="i-heroicons-arrow-down-tray"
          size="sm"
          variant="ghost"
          @click="$emit('download')"
        >
          Download
        </FigButton>
        <FigButton
          v-if="showReprocess"
          icon="i-heroicons-arrow-path"
          size="sm"
          variant="ghost"
          @click="$emit('reprocess')"
          :loading="isReprocessing"
        >
          Reprocess
        </FigButton>
      </div>
    </td>
  </tr>
</template>

<script setup lang="ts">
import { FigButton } from '@figgy/ui'
import { computed } from 'vue'
import type { FileItem } from '@figgy/types'
import FileIcon from '../atoms/FileIcon.vue'
import FileDate from '../atoms/FileDate.vue'
import FileSize from '../atoms/FileSize.vue'
import FileBadge from '../atoms/FileBadge.vue'

interface Props {
  file: FileItem
  isReprocessing?: boolean
  showReprocess?: boolean
  displayName?: string
  totalAmount?: string | null
  documentNumber?: string | null
  documentDate?: string | null
}

interface Emits {
  (e: 'view'): void
  (e: 'download'): void
  (e: 'reprocess'): void
}

const props = withDefaults(defineProps<Props>(), {
  isReprocessing: false,
  showReprocess: true,
  displayName: undefined,
  totalAmount: null,
  documentNumber: null,
  documentDate: null
})

defineEmits<Emits>()

// Use provided displayName or fallback
const displayNameFinal = computed(() => 
  props.displayName || props.file.metadata?.displayName || props.file.fileName
)
</script>