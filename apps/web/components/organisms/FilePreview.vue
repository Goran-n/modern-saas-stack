<template>
  <Teleport to="body">
    <FigModal 
      :modelValue="isOpen"
      @update:modelValue="(val) => isOpen = val" 
      size="6xl"
      :padding="false"
    >
      <template #header>
        <div class="px-6 py-4">
          <FilePreviewHeader
            :file="file"
            :is-reprocessing="fileState.reprocessModal.value.isProcessing"
            @download="handleDownload"
            @reprocess="fileState.openReprocessModal(file)"
            @close="$emit('close')"
          />
        </div>
      </template>

      <template #default>
        <div class="flex flex-col lg:grid lg:grid-cols-file-preview h-[75vh] lg:h-file-preview-desktop">
          <!-- File Preview -->
          <div class="bg-neutral-50 p-4 sm:p-6 overflow-hidden flex-1 lg:flex-initial">
            <FileViewer
              :file-name="file.fileName"
              :proxy-url="proxyUrl"
              @download="handleDownload"
            />
          </div>

          <!-- File Information Sidebar -->
          <div class="bg-white border-t lg:border-t-0 lg:border-l border-neutral-200 p-4 sm:p-6 overflow-y-auto h-file-preview-mobile lg:h-auto">
            <FileInfoPanel 
              :file="file" 
              @reprocess="fileState.openReprocessModal(file)"
            />
          </div>
        </div>
      </template>
    </FigModal>

    <!-- Reprocess Confirmation Modal -->
    <ReprocessModal
      v-model="reprocessModalOpen"
      :loading="fileState.reprocessModal.value.isProcessing"
      @confirm="handleReprocess"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, computed, ref, watch } from 'vue'
import type { FileItem } from '@figgy/types';
import { FigModal } from '@figgy/ui';
import FilePreviewHeader from '../molecules/FilePreviewHeader.vue'
import FileViewer from '../molecules/FileViewer.vue'
import FileInfoPanel from '../molecules/FileInfoPanel.vue'
import ReprocessModal from '../molecules/ReprocessModal.vue'

interface Props {
  file: FileItem
}

interface Emits {
  (e: 'close'): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// Composables
const fileOperations = useFileOperations()
const fileState = useFileState()

// State
const isOpen = ref(true)

// Computed property for modal state
const reprocessModalOpen = computed({
  get: () => fileState.reprocessModal.value.isOpen,
  set: (value) => {
    if (!value) {
      fileState.closeReprocessModal()
    }
  }
})

// Ensure body doesn't scroll when modal is open
onMounted(() => {
  document.body.style.overflow = 'hidden'
})

onUnmounted(() => {
  document.body.style.overflow = ''
})

// Computed
const proxyUrl = computed(() => fileOperations.getProxyUrl(props.file.id))

// Methods
const handleDownload = () => {
  fileOperations.downloadFile(props.file)
}

const handleReprocess = async () => {
  const file = fileState.reprocessModal.value.file
  if (!file) return
  
  fileState.setReprocessModalProcessing(true)
  
  const success = await fileOperations.reprocessFile(file.id)
  
  if (success) {
    fileState.closeReprocessModal()
    isOpen.value = false
    emit('close')
  }
  
  fileState.setReprocessModalProcessing(false)
}

// Watch for modal close
watch(isOpen, (newValue) => {
  if (!newValue) {
    emit('close')
  }
})
</script>