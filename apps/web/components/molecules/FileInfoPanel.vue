<template>
  <div class="space-y-6">
    <!-- Processing Error Alert -->
    <FileErrorAlert
      v-if="file.processingStatus === 'failed'"
      :error-message="getProcessingError(file)"
      :error-details="getProcessingErrorDetails(file)"
      @retry="$emit('reprocess')"
    />

    <!-- Key Document Information (if extracted) -->
    <FigCard v-if="file.extraction?.extractedFields" padding="md">
      <template #header>
        <h4 class="text-sm font-medium">Document Details</h4>
      </template>
      
      <div class="space-y-3">
        <!-- Amount if available -->
        <div v-if="file.extraction.extractedFields.totalAmount?.value" class="bg-primary-50 border border-primary-100 rounded-lg p-4">
          <p class="text-xs font-medium text-primary-700 uppercase tracking-wider mb-1">Total Amount</p>
          <p class="text-2xl font-bold text-primary-900">
            {{ formatCurrency(file.extraction.extractedFields.totalAmount.value, file.extraction.extractedFields.currency?.value) }}
          </p>
        </div>
        
        <!-- Document Info Grid -->
        <div class="grid grid-cols-2 gap-3 text-sm">
          <div v-if="file.extraction.extractedFields.documentNumber?.value">
            <p class="text-xs text-neutral-500">Document Number</p>
            <div class="flex items-center gap-1">
              <p class="font-medium">{{ file.extraction.extractedFields.documentNumber.value }}</p>
              <CopyButton 
                :text="file.extraction.extractedFields.documentNumber.value" 
                class="ml-1"
              />
            </div>
          </div>
          
          <div v-if="file.extraction.extractedFields.documentDate?.value">
            <p class="text-xs text-neutral-500">Document Date</p>
            <FileDate :date="file.extraction.extractedFields.documentDate.value" size="sm" class="font-medium" />
          </div>
          
          <div v-if="file.extraction.extractedFields.dueDate?.value">
            <p class="text-xs text-neutral-500">Due Date</p>
            <FileDate :date="file.extraction.extractedFields.dueDate.value" size="sm" class="font-medium" />
          </div>
          
          <div v-if="file.extraction.extractedFields.vendorName?.value">
            <p class="text-xs text-neutral-500">Vendor</p>
            <p class="font-medium">{{ file.extraction.extractedFields.vendorName.value }}</p>
          </div>
        </div>
      </div>
    </FigCard>

    <!-- File Details -->
    <FigCard padding="md">
      <template #header>
        <h4 class="text-sm font-medium">File Information</h4>
      </template>
      
      <div class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-neutral-500">Original Name:</span>
          <span class="font-medium text-xs">{{ file.fileName }}</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-neutral-500">Size:</span>
          <FileSize :bytes="file.size || 0" size="sm" class="font-medium" />
        </div>
        
        <div class="flex justify-between">
          <span class="text-neutral-500">Type:</span>
          <span class="font-medium">{{ file.mimeType || 'Unknown' }}</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-neutral-500">Uploaded:</span>
          <FileDate :date="file.createdAt" size="sm" class="font-medium" />
        </div>
        
        <div class="flex justify-between">
          <span class="text-neutral-500">Status:</span>
          <FileBadge
            type="status"
            :value="file.processingStatus || 'completed'"
            status-type="processing"
            variant="soft"
            size="xs"
          />
        </div>
      </div>
    </FigCard>

    <!-- Extraction Data -->
    <FigCard v-if="file.extraction" padding="md">
      <template #header>
        <div class="flex items-center justify-between">
          <h4 class="text-sm font-medium">Extracted Data</h4>
          <div class="flex items-center gap-2">
            <span class="text-xs text-neutral-500">Confidence:</span>
            <FileBadge
              type="confidence"
              :value="file.extraction.overallConfidence"
              size="xs"
            />
          </div>
        </div>
      </template>
      
      <div class="space-y-3 text-sm">
        <div class="flex justify-between">
          <span class="text-neutral-500">Document Type:</span>
          <span class="font-medium capitalize">{{ file.extraction.documentType }}</span>
        </div>
        
        <div class="flex justify-between">
          <span class="text-neutral-500">Validation:</span>
          <FileBadge
            type="status"
            :value="file.extraction.validationStatus"
            status-type="validation"
            variant="soft"
            size="xs"
          />
        </div>

        <!-- Key Fields -->
        <div v-if="file.extraction.extractedFields" class="space-y-2 pt-3 border-t">
          <h5 class="text-xs font-medium text-neutral-500 uppercase">Key Fields</h5>
          
          <div v-for="(field, key) in getDisplayFields(file.extraction.extractedFields)" :key="key" class="flex justify-between">
            <span class="text-neutral-500">{{ formatFieldName(String(key)) }}:</span>
            <div class="text-right">
              <div class="font-medium">{{ (field as any).value }}</div>
              <div class="text-xs text-neutral-400">{{ Math.round((field as any).confidence) }}%</div>
            </div>
          </div>
        </div>
      </div>
    </FigCard>

    <!-- No Extraction Data -->
    <FigCard v-else padding="md">
      <template #header>
        <h4 class="text-sm font-medium">Extracted Data</h4>
      </template>
      
      <div class="text-center py-6 text-neutral-500">
        <FigIcon name="i-heroicons-document-magnifying-glass" class="text-3xl mb-2" />
        <p class="text-sm">No extraction data available</p>
        <p class="text-xs">File may still be processing</p>
      </div>
    </FigCard>
  </div>
</template>

<script setup lang="ts">
import type { FileItem } from '@figgy/types'
import { FigCard, FigIcon } from '@figgy/ui'
import FileDate from '../atoms/FileDate.vue'
import FileSize from '../atoms/FileSize.vue'
import FileBadge from '../atoms/FileBadge.vue'
import FileErrorAlert from './FileErrorAlert.vue'
import CopyButton from '../atoms/CopyButton.vue'

interface Props {
  file: FileItem
}

interface Emits {
  (e: 'reprocess'): void
}

defineProps<Props>()
defineEmits<Emits>()

// Composables
const { formatCurrency, formatFieldName } = useFileFormatters()

// Helper functions for processing errors
const getProcessingError = (file: FileItem): string => {
  // Check if file has additional metadata that might contain error info
  if (file.metadata?.processingError) {
    return file.metadata.processingError as string
  }
  return 'File processing failed'
}

const getProcessingErrorDetails = (file: FileItem): string | null => {
  // Check if file has additional metadata that might contain error details
  if (file.metadata?.processingErrorDetails) {
    return file.metadata.processingErrorDetails as string
  }
  return null
}

// Get display fields
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
</script>