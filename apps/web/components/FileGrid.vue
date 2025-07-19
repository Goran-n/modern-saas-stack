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
          :title="file.fileName"
        >
          {{ file.fileName }}
        </h3>

        <!-- File Info -->
        <div class="mt-2 text-center">
          <p class="text-xs text-gray-500">
            {{ formatFileSize(file.size || 0) }}
          </p>
          <p class="text-xs text-gray-400">
            {{ formatDate(file.createdAt) }}
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
  extraction?: {
    overallConfidence: number
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

</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>