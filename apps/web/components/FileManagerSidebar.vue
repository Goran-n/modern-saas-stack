<template>
  <div 
    class="h-full flex flex-col"
    @keydown="handleKeydown"
    tabindex="0"
  >
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-neutral-200 flex-shrink-0">
      <h2 class="text-base font-semibold text-neutral-900">Files</h2>
    </div>

    <!-- Content -->
    <div class="p-4 space-y-4 flex-1 overflow-y-auto">
      <!-- Processing & Failed Files Section -->
      <div class="space-y-2">
        <h3 class="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          Status
        </h3>
        
        <!-- Processing Files -->
        <button
          ref="processingButton"
          @click="$emit('status-selected', 'processing')"
          @keydown.enter.prevent="$emit('status-selected', 'processing')"
          @keydown.space.prevent="$emit('status-selected', 'processing')"
          class="w-full flex items-center justify-between p-2 text-left rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer"
          :class="[
            selectedYear === null && selectedSupplier === null && selectedStatus === 'processing'
              ? 'bg-primary-100 text-primary-800 border border-primary-300 shadow-sm'
              : 'text-neutral-700 hover:bg-neutral-100 border border-transparent'
          ]"
        >
          <div class="flex items-center gap-2">
            <Icon name="heroicons:clock" class="w-4 h-4" />
            <span class="text-sm">Processing</span>
          </div>
          <FigBadge
            v-if="processingFiles.length > 0"
            color="info"
            variant="soft"
            size="xs"
          >
            {{ processingFiles.length }}
          </FigBadge>
        </button>

        <!-- Failed Files -->
        <button
          ref="failedButton"
          @click="$emit('status-selected', 'failed')"
          @keydown.enter.prevent="$emit('status-selected', 'failed')"
          @keydown.space.prevent="$emit('status-selected', 'failed')"
          class="w-full flex items-center justify-between p-2 text-left rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer"
          :class="[
            selectedYear === null && selectedSupplier === null && selectedStatus === 'failed'
              ? 'bg-error-100 text-error-800 border border-error-300 shadow-sm'
              : 'text-neutral-700 hover:bg-neutral-100 border border-transparent'
          ]"
        >
          <div class="flex items-center gap-2">
            <Icon name="heroicons:exclamation-triangle" class="w-4 h-4" />
            <span class="text-sm">Failed</span>
          </div>
          <FigBadge
            v-if="failedFiles.length > 0"
            color="error"
            variant="soft"
            size="xs"
          >
            {{ failedFiles.length }}
          </FigBadge>
        </button>
      </div>

      <!-- Divider -->
      <div class="border-t border-neutral-200"></div>

      <!-- Years & Suppliers Section -->
      <div class="space-y-2">
        <h3 class="text-xs font-medium text-neutral-500 uppercase tracking-wide">
          Browse by Year
        </h3>

        <!-- Loading State -->
        <div v-if="loading" class="space-y-2">
          <FigSkeleton class="h-8 w-full rounded-md" v-for="i in 3" :key="i" />
        </div>

        <!-- Years List -->
        <div v-else-if="years.length > 0" class="space-y-1">
          <button
            v-for="year in years"
            :key="year"
            :data-year="year"
            @click="selectYear(year)"
            @keydown.enter.prevent="selectYear(year)"
            @keydown.space.prevent="selectYear(year)"
            class="w-full flex items-center justify-between p-2 text-left rounded-md transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 cursor-pointer"
            :class="[
              selectedYear === year
                ? 'bg-primary-100 text-primary-800 border border-primary-300 shadow-sm'
                : 'text-neutral-700 hover:bg-neutral-100 border border-transparent'
            ]"
          >
            <div class="flex items-center gap-2">
              <FigIcon name="i-heroicons-calendar-days" class="text-sm text-neutral-600" />
              <span class="text-sm font-medium">{{ year }}</span>
            </div>
            <FigBadge
              v-if="getYearFileCount(year) > 0"
              color="neutral"
              variant="soft"
              size="xs"
            >
              {{ getYearFileCount(year) }}
            </FigBadge>
          </button>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-6 text-neutral-500">
          <FigIcon name="i-heroicons-folder-open" class="text-2xl mb-2 text-neutral-400" />
          <p class="text-xs font-medium">No files uploaded yet</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { FigBadge, FigSkeleton } from '@figgy/ui';
import { nextTick, onMounted } from 'vue';

interface YearData {
  year: string
  suppliers: Record<string, any>
  totalFiles: number
}

interface Props {
  fileData?: {
    byYear: Record<string, YearData>
    totalFiles: number
  }
  processingFiles: any[]
  failedFiles: any[]
  selectedYear: string | null
  selectedSupplier: string | null
  selectedStatus?: 'processing' | 'failed' | null
  loading?: boolean
}

type SelectionEmit = {
  'year-selected': [year: string]
  'supplier-selected': [supplier: string]
  'status-selected': [status: 'processing' | 'failed']
}

interface Emits {
  <T extends keyof SelectionEmit>(e: T, ...args: SelectionEmit[T]): void
}

const props = withDefaults(defineProps<Props>(), {
  fileData: undefined,
  selectedStatus: null,
  loading: false,
})

const emit = defineEmits<Emits>()

// Component state
const currentFocusIndex = ref(0)
const focusableElements = ref<HTMLElement[]>([])

// Template refs
const processingButton = ref<HTMLElement>()
const failedButton = ref<HTMLElement>()

// Computed
const years = computed(() => {
  if (!props.fileData) return []
  return Object.keys(props.fileData.byYear).sort((a, b) => b.localeCompare(a))
})

// Methods
const selectYear = (year: string) => {
  emit('year-selected', year)
}

const getYearFileCount = (year: string): number => {
  if (!props.fileData?.byYear[year]) return 0
  return props.fileData.byYear[year].totalFiles
}


// Keyboard navigation
const updateFocusableElements = () => {
  const elements: HTMLElement[] = []
  
  // Add status buttons
  if (processingButton.value) elements.push(processingButton.value)
  if (failedButton.value) elements.push(failedButton.value)
  
  // Add year buttons
  years.value.forEach(year => {
    const yearBtn = document.querySelector(`[data-year="${year}"]`) as HTMLElement
    if (yearBtn) elements.push(yearBtn)
  })
  
  focusableElements.value = elements
}

const handleKeydown = (event: KeyboardEvent) => {
  if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return
  
  event.preventDefault()
  updateFocusableElements()
  
  switch (event.key) {
    case 'ArrowDown':
      currentFocusIndex.value = Math.min(currentFocusIndex.value + 1, focusableElements.value.length - 1)
      break
    case 'ArrowUp':
      currentFocusIndex.value = Math.max(currentFocusIndex.value - 1, 0)
      break
    case 'Home':
      currentFocusIndex.value = 0
      break
    case 'End':
      currentFocusIndex.value = focusableElements.value.length - 1
      break
  }
  
  focusableElements.value[currentFocusIndex.value]?.focus()
}

// Update focusable elements when years change
watch(() => props.selectedYear, () => {
  nextTick(updateFocusableElements)
}, { immediate: true })

// Update focusable elements on mount
onMounted(() => {
  nextTick(updateFocusableElements)
})
</script>