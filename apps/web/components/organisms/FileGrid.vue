<template>
  <div 
    class="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6"
    role="grid"
    :aria-label="`File grid with ${files.length} files`"
    @keydown="handleKeyNavigation"
  >
    <div
      v-for="file in files"
      :key="file.id"
      :draggable="true"
      @dragstart="handleDragStart($event, file)"
      @dragend="fileState.endDrag()"
    >
      <molecules-file-card
        :file="file"
        :draggable="true"
        :is-dragging="fileState.dragState.value.isDragging"
        :is-reprocessing="fileOperations.isReprocessing(file.id)"
        :show-reprocess="file.processingStatus !== 'processing'"
        :show-status="Boolean(file.processingStatus && file.processingStatus !== 'completed')"
        :show-confidence="Boolean(file.extraction?.overallConfidence)"
        @select="handleFileSelect(file)"
        @reprocess="fileState.openReprocessModal(file)"
      />
    </div>
  </div>

  <!-- Reprocess Confirmation Modal -->
  <molecules-reprocess-modal
    v-model="reprocessModalOpen"
    :loading="fileState.reprocessModal.value.isProcessing"
    @confirm="handleReprocess"
  />
</template>

<script setup lang="ts">
import { ref, nextTick, computed } from 'vue'
import type { FileItem } from '@figgy/types';

interface Props {
  files: FileItem[]
}

const props = defineProps<Props>()

// Define emits
const emit = defineEmits<{
  'file-selected': [file: FileItem | null]
}>()

// Composables
const fileOperations = useFileOperations()
const fileState = useFileState()

// State for keyboard navigation
const focusedIndex = ref(0)

// Computed property for modal state
const reprocessModalOpen = computed({
  get: () => fileState.reprocessModal.value.isOpen,
  set: (value) => {
    if (!value) {
      fileState.closeReprocessModal()
    }
  }
})

// Drag handling
const handleDragStart = (event: DragEvent, file: FileItem) => {
  fileState.startDrag(file)
  fileOperations.handleFileDragStart(event, file)
}

// File selection
const handleFileSelect = (file: FileItem) => {
  fileState.selectFile(file)
  emit('file-selected', file)
}

// Reprocess handling
const handleReprocess = async () => {
  const file = fileState.reprocessModal.value.file
  if (!file) return
  
  fileState.setReprocessModalProcessing(true)
  
  const success = await fileOperations.reprocessFile(file.id)
  
  if (success) {
    fileState.closeReprocessModal()
    // Trigger refresh by clearing selection
    fileState.selectFile(null)
  }
  
  fileState.setReprocessModalProcessing(false)
}

// Keyboard navigation
const handleKeyNavigation = async (event: KeyboardEvent) => {
  // Determine columns based on screen size (default to 2 for mobile)
  const screenWidth = window.innerWidth
  let columns = 2
  if (screenWidth >= 1280) columns = 6      // xl
  else if (screenWidth >= 1024) columns = 5 // lg  
  else if (screenWidth >= 768) columns = 4  // md
  else if (screenWidth >= 640) columns = 3  // sm
  
  const totalItems = props.files.length
  if (totalItems === 0) return
  
  let newIndex = focusedIndex.value
  
  switch (event.key) {
    case 'ArrowRight':
      event.preventDefault()
      newIndex = Math.min(focusedIndex.value + 1, totalItems - 1)
      break
    case 'ArrowLeft':
      event.preventDefault()
      newIndex = Math.max(focusedIndex.value - 1, 0)
      break
    case 'ArrowDown':
      event.preventDefault()
      newIndex = Math.min(focusedIndex.value + columns, totalItems - 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      newIndex = Math.max(focusedIndex.value - columns, 0)
      break
    case 'Home':
      event.preventDefault()
      newIndex = 0
      break
    case 'End':
      event.preventDefault()
      newIndex = totalItems - 1
      break
    default:
      return
  }
  
  focusedIndex.value = newIndex
  
  // Focus the file card element
  await nextTick()
  const gridElement = event.currentTarget as HTMLElement
  const fileCards = gridElement.querySelectorAll('[role="button"]')
  const targetCard = fileCards[newIndex] as HTMLElement
  targetCard?.focus()
}
</script>