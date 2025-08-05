<template>
  <div class="h-full flex items-center justify-center">
    <!-- PDF Preview -->
    <div v-if="isPDFFile" class="w-full h-full flex flex-col">
      <div v-if="proxyUrl && !iframeError" class="w-full flex-1">
        <iframe 
          :src="proxyUrl"
          class="w-full h-full rounded-lg border-0"
          title="PDF Viewer"
          @error="iframeError = true"
        />
      </div>
      <div v-else-if="proxyUrl && iframeError" class="flex items-center justify-center flex-1">
        <div class="text-center text-neutral-500 p-8">
          <Icon name="heroicons:document-text" class="h-16 w-16 mb-4" />
          <p class="mb-4">Your browser doesn't support PDFs or the file couldn't be loaded.</p>
          <FigButton 
            @click="$emit('download')" 
            variant="outline"
          >
            Download PDF
          </FigButton>
        </div>
      </div>
      <div v-else class="flex items-center justify-center flex-1">
        <div class="text-center">
          <FigSkeleton class="h-8 w-32 mb-2" />
          <p class="text-sm text-neutral-500">Loading PDF...</p>
        </div>
      </div>
    </div>
    
    <!-- Image Preview -->
    <div v-else-if="isImage" class="w-full h-full flex items-center justify-center p-8">
      <img 
        v-if="proxyUrl && !imageError"
        :src="proxyUrl" 
        :alt="fileName"
        class="max-w-full max-h-full object-contain"
        @error="handleImageError"
      />
      <div v-else class="text-center text-neutral-500">
        <FigFileIcon :file-name="fileName" size="xl" class="text-6xl mb-4" />
        <p class="text-lg font-medium mb-2">{{ fileName }}</p>
        <p class="mb-4">Preview not available</p>
        <FigButton @click="$emit('download')">
          Download File
        </FigButton>
      </div>
    </div>
    
    <!-- Other File Types -->
    <div v-else class="text-center text-neutral-500">
      <FigFileIcon :file-name="fileName" class="text-6xl mb-4" />
      <p class="text-lg font-medium mb-2">{{ fileName }}</p>
      <p class="mb-4">Preview not available for this file type</p>
      <FigButton @click="$emit('download')">
        Download File
      </FigButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FigButton, FigSkeleton, isImageFile } from '@figgy/ui'
import { FigFileIcon } from '@figgy/ui'
import { isPDF } from '~/utils/fileUtils'

interface Props {
  fileName: string
  proxyUrl: string | null
}

interface Emits {
  (e: 'download'): void
}

const props = defineProps<Props>()
defineEmits<Emits>()

// State
const iframeError = ref(false)
const imageError = ref(false)

// Computed
const isPDFFile = computed(() => isPDF(props.fileName))
const isImage = computed(() => isImageFile(props.fileName))

// Methods
const handleImageError = () => {
  imageError.value = true
}
</script>