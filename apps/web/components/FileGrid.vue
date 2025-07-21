<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
    <UCard
      v-for="file in files"
      :key="file.id"
      class="hover:shadow-md transition-shadow duration-200 group relative cursor-grab active:cursor-grabbing"
      :class="{ 'opacity-50': isDragging }"
      :draggable="true"
      @click="emit('file-selected', file)"
      @dragstart="handleDragStart($event, file)"
      @dragend="handleDragEnd()"
    >
      <!-- Action Buttons -->
      <div class="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex gap-2">
        <!-- Copy Button -->
        <button
          @click.stop="handleCopyFile(file)"
          class="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-primary-500 hover:bg-primary-50 transition-colors"
          title="Copy file for Xero"
        >
          <svg v-if="copiedFileId !== file.id" width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M10.5 2H5.5C4.67157 2 4 2.67157 4 3.5V10.5C4 11.3284 4.67157 12 5.5 12H10.5C11.3284 12 12 11.3284 12 10.5V3.5C12 2.67157 11.3284 2 10.5 2Z" stroke="currentColor" stroke-width="1.5" class="text-primary-500"/>
            <path d="M8 4H11.5C12.3284 4 13 4.67157 13 5.5V12.5C13 13.3284 12.3284 14 11.5 14H6.5C5.67157 14 5 13.3284 5 12.5V12" stroke="currentColor" stroke-width="1.5" class="text-primary-500"/>
          </svg>
          <svg v-else width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M13 5L6 12L3 9" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-green-500"/>
          </svg>
        </button>
        
        <!-- Drag Indicator -->
        <div class="w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center border-2 border-primary-500 pointer-events-none">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 4.5C7 5.32843 6.32843 6 5.5 6C4.67157 6 4 5.32843 4 4.5C4 3.67157 4.67157 3 5.5 3C6.32843 3 7 3.67157 7 4.5Z" fill="currentColor" class="text-primary-500"/>
            <path d="M7 10C7 10.8284 6.32843 11.5 5.5 11.5C4.67157 11.5 4 10.8284 4 10C4 9.17157 4.67157 8.5 5.5 8.5C6.32843 8.5 7 9.17157 7 10Z" fill="currentColor" class="text-primary-500"/>
            <path d="M7 15.5C7 16.3284 6.32843 17 5.5 17C4.67157 17 4 16.3284 4 15.5C4 14.6716 4.67157 14 5.5 14C6.32843 14 7 14.6716 7 15.5Z" fill="currentColor" class="text-primary-500"/>
            <path d="M14.5 4.5C14.5 5.32843 13.8284 6 13 6C12.1716 6 11.5 5.32843 11.5 4.5C11.5 3.67157 12.1716 3 13 3C13.8284 3 14.5 3.67157 14.5 4.5Z" fill="currentColor" class="text-primary-500"/>
            <path d="M14.5 10C14.5 10.8284 13.8284 11.5 13 11.5C12.1716 11.5 11.5 10.8284 11.5 10C11.5 9.17157 12.1716 8.5 13 8.5C13.8284 8.5 14.5 9.17157 14.5 10Z" fill="currentColor" class="text-primary-500"/>
            <path d="M14.5 15.5C14.5 16.3284 13.8284 17 13 17C12.1716 17 11.5 16.3284 11.5 15.5C11.5 14.6716 12.1716 14 13 14C13.8284 14 14.5 14.6716 14.5 15.5Z" fill="currentColor" class="text-primary-500"/>
          </svg>
        </div>
      </div>
      
      <div class="aspect-square flex flex-col items-center justify-center p-4">
        <!-- File Icon or Thumbnail -->
        <div class="w-12 h-12 mb-3 flex items-center justify-center">
          <UIcon 
            :name="getFileIcon(file.fileName)" 
            class="text-3xl"
            :class="getFileIconColor(file.fileName)"
          />
        </div>

        <!-- File Name -->
        <h3 
          class="text-sm font-medium text-gray-900 text-center line-clamp-2 hover:text-primary-600 transition-colors"
          :title="file.metadata?.displayName || file.fileName"
        >
          {{ file.metadata?.displayName || file.fileName }}
        </h3>

        <!-- Supplier Name if available -->
        <p v-if="file.metadata?.supplierName" class="text-xs text-gray-600 text-center mt-1">
          {{ file.metadata.supplierName }}
        </p>

        <!-- Document Info -->
        <div class="mt-2 text-center space-y-1">
          <!-- Amount if available -->
          <p v-if="file.extraction?.extractedFields?.totalAmount?.value" class="text-sm font-semibold text-gray-900">
            {{ formatCurrency(file.extraction.extractedFields.totalAmount.value, file.extraction.extractedFields.currency?.value) }}
          </p>
          
          <!-- Document Number if available -->
          <p v-if="file.extraction?.extractedFields?.documentNumber?.value" class="text-xs text-gray-600">
            #{{ file.extraction.extractedFields.documentNumber.value }}
          </p>

          <!-- Date if extracted, otherwise created date -->
          <p class="text-xs text-gray-500">
            {{ file.extraction?.extractedFields?.documentDate?.value 
              ? formatDate(file.extraction.extractedFields.documentDate.value)
              : formatDate(file.createdAt) }}
          </p>

          <!-- File size -->
          <p class="text-xs text-gray-400">
            {{ formatFileSize(file.size || 0) }}
          </p>
        </div>

        <!-- Processing Status Badge -->
        <div v-if="file.processingStatus && file.processingStatus !== 'completed'" class="mt-2">
          <UBadge
            :color="getStatusColor(file.processingStatus)"
            variant="soft"
            size="xs"
          >
            {{ file.processingStatus }}
          </UBadge>
        </div>

        <!-- Extraction Quality Indicator -->
        <div v-if="file.extraction && file.extraction.overallConfidence" class="mt-1">
          <div class="flex items-center gap-1">
            <div class="w-3 h-3 rounded-full" :class="getConfidenceIndicator(file.extraction.overallConfidence)" />
            <span class="text-xs text-gray-500">
              {{ Math.round(file.extraction.overallConfidence) }}%
            </span>
          </div>
        </div>
      </div>
    </UCard>
  </div>
</template>

<script setup lang="ts">
interface FileItem {
  id: string
  fileName: string
  size?: number
  createdAt: string
  processingStatus?: string
  metadata?: {
    displayName?: string
    supplierName?: string
    documentType?: string
    [key: string]: any
  }
  extraction?: {
    overallConfidence: number
    documentType?: string
    extractedFields?: {
      totalAmount?: { value: any; confidence: number }
      documentNumber?: { value: any; confidence: number }
      documentDate?: { value: any; confidence: number }
      currency?: { value: any; confidence: number }
      [key: string]: any
    }
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

// Copy handling
const copiedFileId = ref<string | null>(null)

async function handleCopyFile(file: FileItem) {
  try {
    const fileName = file.metadata?.displayName || file.fileName
    const tenantId = useTenantStore().selectedTenantId
    
    // Prepare data for clipboard
    const clipboardData = {
      type: 'kibly-file',
      fileId: file.id,
      fileName: fileName,
      tenantId: tenantId,
      mimeType: file.metadata?.mimeType || 'application/octet-stream',
      timestamp: Date.now()
    }
    
    // Write to clipboard
    await navigator.clipboard.writeText(JSON.stringify(clipboardData))
    
    // Show success feedback
    copiedFileId.value = file.id
    
    // Notify extension if it's installed
    if (window.postMessage) {
      window.postMessage({
        type: 'kibly-file-copied',
        data: clipboardData
      }, '*')
    }
    
    // Reset checkmark after 2 seconds
    setTimeout(() => {
      if (copiedFileId.value === file.id) {
        copiedFileId.value = null
      }
    }, 2000)
    
    // Show success feedback
    const notifications = useNotifications()
    notifications.general.success(`${fileName} copied!`, 'Paste in Xero with Ctrl+V')
  } catch (error) {
    const notifications = useNotifications()
    notifications.general.error('Failed to copy file')
  }
}

// Drag handling
const isDragging = ref(false)

const handleDragStart = (event: DragEvent, file: FileItem) => {
  isDragging.value = true
  
  const fileName = file.metadata?.displayName || file.fileName
  const tenantId = useTenantStore().selectedTenantId
  
  // Set drag data for the file
  const dragData = {
    type: 'kibly-file',
    fileId: file.id,
    fileName: fileName,
    tenantId: tenantId,
  }
  
  // Set multiple data types to maximize compatibility
  event.dataTransfer!.effectAllowed = 'copy'
  
  // 1. Custom data for our extension
  event.dataTransfer!.setData('application/x-kibly-file', JSON.stringify(dragData))
  
  // 2. Text/plain fallback
  event.dataTransfer!.setData('text/plain', JSON.stringify(dragData))
  
  // 4. Set a proper drag image that looks like a file
  const dragImage = document.createElement('div')
  dragImage.className = 'drag-ghost'
  dragImage.innerHTML = `
    <div style="
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: white;
      border-radius: 6px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      font-family: system-ui, -apple-system, sans-serif;
    ">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M9 1H3C2.44772 1 2 1.44772 2 2V14C2 14.5523 2.44772 15 3 15H13C13.5523 15 14 14.5523 14 14V6L9 1Z" stroke="#666" stroke-width="1.5"/>
        <path d="M9 1V6H14" stroke="#666" stroke-width="1.5"/>
      </svg>
      <span style="color: #333; font-size: 14px;">${fileName}</span>
    </div>
  `
  dragImage.style.position = 'absolute'
  dragImage.style.top = '-1000px'
  document.body.appendChild(dragImage)
  event.dataTransfer!.setDragImage(dragImage, 0, 0)
  setTimeout(() => dragImage.remove(), 0)
}

const handleDragEnd = () => {
  isDragging.value = false
}

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

const formatCurrency = (amount: any, currency?: any): string => {
  const numAmount = parseFloat(amount)
  if (isNaN(numAmount)) return amount
  
  const curr = currency || 'GBP'
  const formatter = new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: curr,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  
  return formatter.format(numAmount)
}

</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>