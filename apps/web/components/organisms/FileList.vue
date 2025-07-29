<template>
  <FileTable :columns="columns">
    <FileRow
      v-for="file in files"
      :key="file.id"
      :file="file"
      :is-reprocessing="fileOperations.isReprocessing(file.id)"
      :show-reprocess="file.processingStatus !== 'processing'"
      :display-name="file.metadata?.displayName || file.fileName"
      :total-amount="formatAmount(file)"
      :document-number="file.extraction?.extractedFields?.documentNumber?.value"
      :document-date="file.extraction?.extractedFields?.documentDate?.value"
      @view="fileState.selectFile(file)"
      @download="fileOperations.downloadFile(file)"
      @reprocess="fileState.openReprocessModal(file)"
    />
  </FileTable>

  <!-- Reprocess Confirmation Modal -->
  <ReprocessModal
    v-model="reprocessModalOpen"
    :loading="fileState.reprocessModal.value.isProcessing"
    @confirm="handleReprocess"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { FileItem } from '@figgy/types';

interface Props {
  files: FileItem[]
}

defineProps<Props>()

// Composables
const fileOperations = useFileOperations()
const fileState = useFileState()
const { formatCurrency } = useFileFormatters()

// Computed property for modal state
const reprocessModalOpen = computed({
  get: () => fileState.reprocessModal.value.isOpen,
  set: (value) => {
    if (!value) {
      fileState.closeReprocessModal()
    }
  }
})

// Helpers
const formatAmount = (file: FileItem): string | null => {
  const amount = file.extraction?.extractedFields?.totalAmount?.value
  const currency = file.extraction?.extractedFields?.currency?.value
  return amount ? formatCurrency(amount, currency) : null
}

// Table configuration
const columns = [
  { key: 'name', label: 'Name', class: 'min-w-0 w-2/5' },
  { key: 'status', label: 'Status', class: 'w-1/5' },
  { key: 'date', label: 'Date', class: 'w-1/5' },
  { key: 'actions', label: '', class: 'w-1/5 text-right' }
]

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
</script>