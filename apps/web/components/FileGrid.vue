<template>
  <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
    <UCard
      v-for="file in files"
      :key="file.id"
      class="cursor-pointer hover:shadow-md transition-shadow duration-200"
      @click="emit('file-selected', file)"
    >
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

// No longer needed since overlay was removed

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