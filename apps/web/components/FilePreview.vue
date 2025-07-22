<template>
  <div class="modal-overlay">
    <UModal 
      v-model="isOpen" 
      :ui="{ 
        width: 'w-full max-w-5xl',
        wrapper: 'fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4',
        overlay: {
          base: 'fixed inset-0 transition-opacity z-40',
          background: 'bg-gray-500/75 dark:bg-gray-900/75'
        }
      } as any"
    >
    <UCard>
      <template #header>
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-3">
            <UIcon 
              :name="getFileIcon(file.fileName)" 
              class="text-xl"
              :class="getFileIconColor(file.fileName)"
            />
            <div>
              <h3 class="text-lg font-medium">{{ file.metadata?.displayName || file.fileName }}</h3>
              <div class="flex items-center gap-2 text-sm text-gray-500">
                <span v-if="file.metadata?.supplierName">{{ file.metadata.supplierName }} •</span>
                <span>{{ formatFileSize(file.size || 0) }} •</span>
                <span>{{ formatDate(file.extraction?.extractedFields?.documentDate?.value || file.createdAt) }}</span>
              </div>
            </div>
          </div>
          
          <div class="flex items-center gap-2">
            <UButton
              icon="i-heroicons-arrow-down-tray"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="downloadFile"
            >
              Download
            </UButton>
            <UButton
              v-if="file.processingStatus !== 'processing'"
              icon="i-heroicons-arrow-path"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="handleReprocess"
              :loading="isReprocessing"
            >
              Reprocess
            </UButton>
            <UButton
              icon="i-heroicons-x-mark"
              size="sm"
              color="neutral"
              variant="ghost"
              @click="$emit('close')"
            />
          </div>
        </div>
      </template>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-6 max-h-[70vh] overflow-hidden">
        <!-- File Preview -->
        <div class="lg:col-span-2">
          <div class="bg-gray-50 rounded-lg p-4 h-full min-h-[500px] flex items-center justify-center">
            <!-- PDF Preview -->
            <div v-if="isPDF(file.fileName)" class="w-full h-full">
              <div v-if="proxyUrl && !iframeError" class="w-full h-[500px]">
                <iframe 
                  :src="proxyUrl"
                  class="w-full h-full rounded-lg border-0"
                  title="PDF Viewer"
                  @error="iframeError = true"
                />
              </div>
              <div v-else-if="proxyUrl && iframeError" class="flex items-center justify-center h-[500px]">
                <div class="text-center text-gray-500 p-8">
                  <UIcon name="i-heroicons-document-text" class="text-6xl mb-4" />
                  <p class="mb-4">Your browser doesn't support PDFs or the file couldn't be loaded.</p>
                  <UButton 
                    @click="downloadFile" 
                    variant="outline"
                  >
                    Download PDF
                  </UButton>
                </div>
              </div>
              <div v-else class="flex items-center justify-center h-[500px]">
                <div class="text-center">
                  <USkeleton class="h-8 w-32 mb-2" />
                  <p class="text-sm text-gray-500">Loading PDF...</p>
                </div>
              </div>
            </div>
            
            <!-- Image Preview -->
            <div v-else-if="isImage(file.fileName)" class="w-full h-full">
              <img 
                :src="proxyUrl || undefined" 
                :alt="file.fileName"
                class="max-w-full max-h-[500px] object-contain mx-auto"
              />
            </div>
            
            <!-- Other File Types -->
            <div v-else class="text-center text-gray-500">
              <UIcon :name="getFileIcon(file.fileName)" class="text-6xl mb-4" />
              <p class="text-lg font-medium mb-2">{{ file.fileName }}</p>
              <p class="mb-4">Preview not available for this file type</p>
              <UButton @click="downloadFile">
                Download File
              </UButton>
            </div>
          </div>
        </div>

        <!-- File Information Sidebar -->
        <div class="space-y-4 overflow-y-auto">
          <!-- Key Document Information (if extracted) -->
          <UCard v-if="file.extraction?.extractedFields">
            <template #header>
              <h4 class="text-sm font-medium">Document Details</h4>
            </template>
            
            <div class="space-y-3">
              <!-- Amount if available -->
              <div v-if="file.extraction.extractedFields.totalAmount?.value" class="bg-primary-50 rounded-lg p-3">
                <p class="text-xs text-gray-600 mb-1">Total Amount</p>
                <p class="text-xl font-semibold text-gray-900">
                  {{ formatCurrency(file.extraction.extractedFields.totalAmount.value, file.extraction.extractedFields.currency?.value) }}
                </p>
              </div>
              
              <!-- Document Info Grid -->
              <div class="grid grid-cols-2 gap-3 text-sm">
                <div v-if="file.extraction.extractedFields.documentNumber?.value">
                  <p class="text-xs text-gray-500">Document Number</p>
                  <p class="font-medium">{{ file.extraction.extractedFields.documentNumber.value }}</p>
                </div>
                
                <div v-if="file.extraction.extractedFields.documentDate?.value">
                  <p class="text-xs text-gray-500">Document Date</p>
                  <p class="font-medium">{{ formatDate(file.extraction.extractedFields.documentDate.value) }}</p>
                </div>
                
                <div v-if="file.extraction.extractedFields.dueDate?.value">
                  <p class="text-xs text-gray-500">Due Date</p>
                  <p class="font-medium">{{ formatDate(file.extraction.extractedFields.dueDate.value) }}</p>
                </div>
                
                <div v-if="file.extraction.extractedFields.vendorName?.value">
                  <p class="text-xs text-gray-500">Vendor</p>
                  <p class="font-medium">{{ file.extraction.extractedFields.vendorName.value }}</p>
                </div>
              </div>
            </div>
          </UCard>

          <!-- File Details -->
          <UCard>
            <template #header>
              <h4 class="text-sm font-medium">File Information</h4>
            </template>
            
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Original Name:</span>
                <span class="font-medium text-xs">{{ file.fileName }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-gray-500">Size:</span>
                <span class="font-medium">{{ formatFileSize(file.size || 0) }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-gray-500">Type:</span>
                <span class="font-medium">{{ file.mimeType || 'Unknown' }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-gray-500">Uploaded:</span>
                <span class="font-medium">{{ formatDate(file.createdAt) }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-gray-500">Status:</span>
                <UBadge
                  :color="getStatusColor(file.processingStatus || 'completed')"
                  variant="soft"
                  size="xs"
                >
                  {{ file.processingStatus || 'completed' }}
                </UBadge>
              </div>
            </div>
          </UCard>

          <!-- Extraction Data -->
          <UCard v-if="file.extraction">
            <template #header>
              <div class="flex items-center justify-between">
                <h4 class="text-sm font-medium">Extracted Data</h4>
                <div class="flex items-center gap-2">
                  <span class="text-xs text-gray-500">Confidence:</span>
                  <UBadge
                    :color="getConfidenceColor(file.extraction.overallConfidence)"
                    variant="soft"
                    size="xs"
                  >
                    {{ Math.round(file.extraction.overallConfidence) }}%
                  </UBadge>
                </div>
              </div>
            </template>
            
            <div class="space-y-3 text-sm">
              <div class="flex justify-between">
                <span class="text-gray-500">Document Type:</span>
                <span class="font-medium capitalize">{{ file.extraction.documentType }}</span>
              </div>
              
              <div class="flex justify-between">
                <span class="text-gray-500">Validation:</span>
                <UBadge
                  :color="getValidationColor(file.extraction.validationStatus)"
                  variant="soft"
                  size="xs"
                >
                  {{ file.extraction.validationStatus.replace('_', ' ') }}
                </UBadge>
              </div>

              <!-- Key Fields -->
              <div v-if="file.extraction.extractedFields" class="space-y-2 pt-3 border-t">
                <h5 class="text-xs font-medium text-gray-500 uppercase">Key Fields</h5>
                
                <div v-for="(field, key) in getDisplayFields(file.extraction.extractedFields)" :key="key" class="flex justify-between">
                  <span class="text-gray-500">{{ formatFieldName(String(key)) }}:</span>
                  <div class="text-right">
                    <div class="font-medium">{{ field.value }}</div>
                    <div class="text-xs text-gray-400">{{ Math.round(field.confidence) }}%</div>
                  </div>
                </div>
              </div>
            </div>
          </UCard>

          <!-- No Extraction Data -->
          <UCard v-else>
            <template #header>
              <h4 class="text-sm font-medium">Extracted Data</h4>
            </template>
            
            <div class="text-center py-6 text-gray-500">
              <UIcon name="i-heroicons-document-magnifying-glass" class="text-3xl mb-2" />
              <p class="text-sm">No extraction data available</p>
              <p class="text-xs">File may still be processing</p>
            </div>
          </UCard>
        </div>
      </div>
    </UCard>
    </UModal>

    <!-- Reprocess Confirmation Modal -->
    <UModal v-model:open="showReprocessModal" title="Confirm Reprocess">
      <template #body>
        <div class="space-y-4">
          <p class="text-sm text-gray-600">
            Are you sure you want to reprocess this file?
          </p>
          <div class="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div class="flex">
              <div class="flex-shrink-0">
                <UIcon name="i-heroicons-exclamation-triangle" class="h-5 w-5 text-yellow-400" />
              </div>
              <div class="ml-3">
                <h3 class="text-sm font-medium text-yellow-800">Warning</h3>
                <div class="mt-2 text-sm text-yellow-700">
                  <ul class="list-disc list-inside space-y-1">
                    <li>All extracted data will be deleted</li>
                    <li>Supplier links will be removed</li>
                    <li>The file will be processed from scratch</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </template>

      <template #footer="{ close }">
        <div class="flex justify-end gap-3">
          <UButton
            color="neutral"
            variant="solid"
            @click="close"
          >
            Cancel
          </UButton>
          <UButton
            color="primary"
            variant="solid"
            @click="reprocessFile"
            :loading="isReprocessing"
          >
            Reprocess File
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
interface FileItem {
  id: string
  fileName: string
  size?: number
  mimeType?: string
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
    documentType: string
    validationStatus: string
    extractedFields?: Record<string, any>
  }
}

interface Props {
  file: FileItem
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composables
const tenantStore = useTenantStore()
const config = useRuntimeConfig()
const toast = useToast()
const trpc = useTrpc()

// State
const isOpen = ref(true)
const iframeError = ref(false)
const showReprocessModal = ref(false)
const isReprocessing = ref(false)

// Debug logging
console.log('FilePreview mounted with file:', props.file)

// Ensure body doesn't scroll when modal is open
onMounted(() => {
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

// Computed
const proxyUrl = computed(() => {
  if (!props.file.id || !tenantStore.selectedTenantId) return null
  const apiUrl = config.public.apiUrl
  return `${apiUrl}/api/files/proxy/${props.file.id}?tenantId=${tenantStore.selectedTenantId}#toolbar=0`
})

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
    default:
      return 'text-gray-500'
  }
}

const isPDF = (fileName: string): boolean => {
  return fileName.toLowerCase().endsWith('.pdf')
}

const isImage = (fileName: string): boolean => {
  const ext = fileName.split('.').pop()?.toLowerCase()
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')
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

const getConfidenceColor = (confidence: number): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' => {
  if (confidence >= 90) return 'success'
  if (confidence >= 70) return 'warning'
  return 'error'
}

const getValidationColor = (status: string): 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral' => {
  if (status === 'valid') return 'success'
  if (status === 'needs_review') return 'warning'
  return 'error'
}

const formatFieldName = (key: string): string => {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())
}

const getDisplayFields = (extractedFields: any) => {
  if (!extractedFields) return {}
  
  const importantFields = [
    'vendorName',
    'documentNumber',
    'documentDate',
    'totalAmount',
    'subtotalAmount',
    'taxAmount',
    'currency',
    'dueDate'
  ]
  
  const filtered: any = {}
  importantFields.forEach(field => {
    if (extractedFields[field]) {
      filtered[field] = extractedFields[field]
    }
  })
  
  return filtered
}

const downloadFile = async () => {
  try {
    const selectedTenantId = tenantStore.selectedTenantId
    if (!selectedTenantId) return
    
    const apiUrl = config.public.apiUrl
    const downloadUrl = `${apiUrl}/api/files/download/${props.file.id}?tenantId=${selectedTenantId}`
    
    window.open(downloadUrl, '_blank')
  } catch (error) {
    console.error('Download failed:', error)
  }
}

const handleReprocess = () => {
  showReprocessModal.value = true
}

const reprocessFile = async () => {
  isReprocessing.value = true
  
  try {
    await trpc.files.reprocess.mutate({ fileId: props.file.id })
    
    toast.add({
      title: 'Reprocessing started',
      description: 'The file will be processed again from scratch',
      color: 'primary',
      icon: 'i-heroicons-arrow-path',
    })
    
    // Close modals
    showReprocessModal.value = false
    isOpen.value = false
    
    // Emit close to trigger refresh
    emit('close')
  } catch (error) {
    console.error('Reprocess failed:', error)
    toast.add({
      title: 'Reprocess failed',
      description: error instanceof Error ? error.message : 'Failed to reprocess file',
      color: 'error',
      icon: 'i-heroicons-exclamation-circle',
    })
  } finally {
    isReprocessing.value = false
  }
}

// Watch for modal close
watch(isOpen, (newValue) => {
  if (!newValue) {
    emit('close')
  }
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
}
</style>