<template>
  <UTable
    :rows="files"
    :columns="columns"
    class="border border-gray-200 rounded-lg"
  >
    <!-- File Name Column -->
    <template #name-data="{ row }">
      <div class="flex items-center gap-3">
        <UIcon 
          :name="getFileIcon((row as any).fileName)" 
          class="text-lg"
          :class="getFileIconColor((row as any).fileName)"
        />
        <div class="min-w-0 flex-1">
          <div class="text-sm font-medium text-gray-900 truncate" :title="(row as any).fileName">
            {{ (row as any).fileName }}
          </div>
          <div class="text-xs text-gray-500">
            {{ formatFileSize((row as any).size || 0) }}
          </div>
        </div>
      </div>
    </template>

    <!-- Status Column -->
    <template #status-data="{ row }">
      <div class="flex items-center gap-2">
        <UBadge
          :color="getStatusColor((row as any).processingStatus || 'completed')"
          variant="soft"
          size="xs"
        >
          {{ getStatusLabel((row as any).processingStatus || 'completed') }}
        </UBadge>
        
        <!-- Extraction Confidence -->
        <div v-if="(row as any).extraction && (row as any).extraction.overallConfidence" class="flex items-center gap-1">
          <div class="w-2 h-2 rounded-full" :class="getConfidenceIndicator((row as any).extraction.overallConfidence)" />
          <span class="text-xs text-gray-500">
            {{ Math.round((row as any).extraction.overallConfidence) }}%
          </span>
        </div>
      </div>
    </template>

    <!-- Date Column -->
    <template #date-data="{ row }">
      <div class="text-sm text-gray-500">
        <div>{{ formatDate((row as any).createdAt) }}</div>
        <div class="text-xs">{{ formatTime((row as any).createdAt) }}</div>
      </div>
    </template>

    <!-- Actions Column -->
    <template #actions-data="{ row }">
      <div class="flex items-center gap-2">
        <UButton
          icon="i-heroicons-eye"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="emit('file-selected', row as any)"
        >
          View
        </UButton>
        <UButton
          icon="i-heroicons-arrow-down-tray"
          size="xs"
          color="neutral"
          variant="ghost"
          @click="downloadFile(row as any)"
        >
          Download
        </UButton>
      </div>
    </template>
  </UTable>
</template>

<script setup lang="ts">
interface FileItem {
  id: string
  fileName: string
  size?: number
  createdAt: string
  processingStatus?: string
  extraction?: {
    overallConfidence: number
    documentType?: string
  }
}

interface Props {
  files: FileItem[]
}

interface Emits {
  (e: 'file-selected', file: FileItem): void
}

defineProps<Props>()
const emit = defineEmits<Emits>()

// Composables
const tenantStore = useTenantStore()
const config = useRuntimeConfig()

// Table configuration
const columns = [
  { key: 'name', label: 'Name', class: 'min-w-0 w-2/5' },
  { key: 'status', label: 'Status', class: 'w-1/5' },
  { key: 'date', label: 'Date', class: 'w-1/5' },
  { key: 'actions', label: '', class: 'w-1/5 text-right' }
] as any

// Methods
const getFileIcon = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  switch (ext) {
    case 'pdf':
      return 'i-heroicons-document-text'
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return 'i-heroicons-photo'
    case 'xls':
    case 'xlsx':
      return 'i-heroicons-table-cells'
    case 'doc':
    case 'docx':
      return 'i-heroicons-document'
    case 'zip':
    case 'rar':
    case '7z':
      return 'i-heroicons-archive-box'
    default:
      return 'i-heroicons-document'
  }
}

const getFileIconColor = (fileName: string): string => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  
  switch (ext) {
    case 'pdf':
      return 'text-red-500'
    case 'jpg':
    case 'jpeg':
    case 'png':
    case 'gif':
    case 'webp':
      return 'text-green-500'
    case 'xls':
    case 'xlsx':
      return 'text-emerald-500'
    case 'doc':
    case 'docx':
      return 'text-blue-500'
    case 'zip':
    case 'rar':
    case '7z':
      return 'text-purple-500'
    default:
      return 'text-gray-500'
  }
}

const getStatusColor = (status: string): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' => {
  switch (status) {
    case 'processing':
      return 'info'
    case 'failed':
      return 'error'
    case 'pending':
      return 'warning'
    case 'completed':
      return 'success'
    default:
      return 'neutral'
  }
}

const getStatusLabel = (status: string): string => {
  switch (status) {
    case 'processing':
      return 'Processing'
    case 'failed':
      return 'Failed'
    case 'pending':
      return 'Pending'
    case 'completed':
      return 'Completed'
    default:
      return 'Unknown'
  }
}

const getConfidenceIndicator = (confidence: number): string => {
  if (confidence >= 90) return 'bg-green-500'
  if (confidence >= 70) return 'bg-yellow-500'
  return 'bg-red-500'
}

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1048576) return Math.round(bytes / 1024) + ' KB'
  return Math.round(bytes / 1048576 * 10) / 10 + ' MB'
}

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString()
}

const formatTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString([], { 
    hour: '2-digit', 
    minute: '2-digit' 
  })
}


const downloadFile = async (file: FileItem) => {
  try {
    const selectedTenantId = tenantStore.selectedTenantId
    if (!selectedTenantId) return
    
    const apiUrl = config.public.apiUrl
    const downloadUrl = `${apiUrl}/api/files/download/${file.id}?tenantId=${selectedTenantId}`
    
    // Open download in new tab
    window.open(downloadUrl, '_blank')
  } catch (error) {
    console.error('Download failed:', error)
  }
}

</script>