<template>
  <div class="h-full flex flex-col">
    <!-- Header -->
    <div class="flex items-center justify-between p-4 border-b border-gray-200 flex-shrink-0">
      <h2 class="text-lg font-medium text-gray-900">Files</h2>
    </div>

    <!-- Content -->
    <div class="p-4 space-y-4 flex-1 overflow-y-auto">
      <!-- Processing & Failed Files Section -->
      <div class="space-y-2">
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Status
        </h3>
        
        <!-- Processing Files -->
        <button
          @click="$emit('status-selected', 'processing')"
          class="w-full flex items-center justify-between p-2 text-left rounded-md transition-colors"
          :class="[
            selectedYear === null && selectedSupplier === null && selectedStatus === 'processing'
              ? 'bg-primary-50 text-primary-700 border border-primary-200'
              : 'text-gray-700 hover:bg-gray-50'
          ]"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-clock" class="text-sm" />
            <span class="text-sm">Processing</span>
          </div>
          <UBadge
            v-if="processingFiles.length > 0"
            color="info"
            variant="soft"
            size="xs"
          >
            {{ processingFiles.length }}
          </UBadge>
        </button>

        <!-- Failed Files -->
        <button
          @click="$emit('status-selected', 'failed')"
          class="w-full flex items-center justify-between p-2 text-left rounded-md transition-colors"
          :class="[
            selectedYear === null && selectedSupplier === null && selectedStatus === 'failed'
              ? 'bg-red-50 text-red-700 border border-red-200'
              : 'text-gray-700 hover:bg-gray-50'
          ]"
        >
          <div class="flex items-center gap-2">
            <UIcon name="i-heroicons-exclamation-triangle" class="text-sm" />
            <span class="text-sm">Failed</span>
          </div>
          <UBadge
            v-if="failedFiles.length > 0"
            color="error"
            variant="soft"
            size="xs"
          >
            {{ failedFiles.length }}
          </UBadge>
        </button>
      </div>

      <!-- Divider -->
      <div class="border-t border-gray-200"></div>

      <!-- Years & Suppliers Section -->
      <div class="space-y-2">
        <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wide">
          Browse by Year
        </h3>

        <!-- Loading State -->
        <div v-if="loading" class="space-y-2">
          <USkeleton class="h-8 w-full" v-for="i in 3" :key="i" />
        </div>

        <!-- Years Tree -->
        <div v-else-if="years.length > 0" class="space-y-1">
          <div v-for="year in years" :key="year" class="space-y-1">
            <!-- Year Item -->
            <button
              @click="toggleYear(year)"
              class="w-full flex items-center justify-between p-2 text-left rounded-md transition-colors"
              :class="[
                selectedYear === year && !selectedSupplier
                  ? 'bg-primary-50 text-primary-700 border border-primary-200'
                  : 'text-gray-700 hover:bg-gray-50'
              ]"
            >
              <div class="flex items-center gap-2">
                <UIcon 
                  :name="expandedYears.has(year) ? 'i-heroicons-chevron-down' : 'i-heroicons-chevron-right'" 
                  class="text-xs text-gray-400"
                />
                <UIcon name="i-heroicons-calendar-days" class="text-sm" />
                <span class="text-sm font-medium">{{ year }}</span>
              </div>
              <UBadge
                v-if="getYearFileCount(year) > 0"
                color="neutral"
                variant="soft"
                size="xs"
              >
                {{ getYearFileCount(year) }}
              </UBadge>
            </button>

            <!-- Suppliers for Year -->
            <div 
              v-if="expandedYears.has(year)" 
              class="ml-6 space-y-1 transition-all duration-200"
            >
              <button
                v-for="supplier in getYearSuppliers(year)"
                :key="`${year}-${supplier.name}`"
                @click="selectSupplier(year, supplier.name)"
                class="w-full flex items-center justify-between p-2 text-left rounded-md transition-colors"
                :class="[
                  selectedYear === year && selectedSupplier === supplier.name
                    ? 'bg-primary-50 text-primary-700 border border-primary-200'
                    : 'text-gray-600 hover:bg-gray-50'
                ]"
              >
                <div class="flex items-center gap-2">
                  <UIcon name="i-heroicons-building-office-2" class="text-xs" />
                  <span class="text-sm">{{ supplier.name }}</span>
                </div>
                <UBadge
                  v-if="supplier.fileCount > 0"
                  color="neutral"
                  variant="soft"
                  size="xs"
                >
                  {{ supplier.fileCount }}
                </UBadge>
              </button>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <div v-else class="text-center py-6 text-gray-500">
          <UIcon name="i-heroicons-folder-open" class="text-2xl mb-2" />
          <p class="text-sm">No files uploaded yet</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Supplier {
  name: string
  fileCount: number
  supplierId?: string | null
}

interface YearData {
  year: string
  suppliers: Record<string, Supplier>
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
const expandedYears = ref(new Set<string>())

// Computed
const years = computed(() => {
  if (!props.fileData) return []
  return Object.keys(props.fileData.byYear).sort((a, b) => b.localeCompare(a))
})

// Methods
const toggleYear = (year: string) => {
  if (expandedYears.value.has(year)) {
    expandedYears.value.delete(year)
    // If this year was selected and we're collapsing it, emit year selection to show all files for that year
    if (props.selectedYear === year) {
      emit('year-selected', year)
    }
  } else {
    expandedYears.value.add(year)
    emit('year-selected', year)
  }
}

const selectSupplier = (year: string, supplier: string) => {
  emit('year-selected', year)
  emit('supplier-selected', supplier)
}

const getYearFileCount = (year: string): number => {
  if (!props.fileData?.byYear[year]) return 0
  return props.fileData.byYear[year].totalFiles
}

const getYearSuppliers = (year: string): Supplier[] => {
  if (!props.fileData?.byYear[year]) return []
  return Object.values(props.fileData.byYear[year].suppliers)
}

// Auto-expand selected year
watch(() => props.selectedYear, (newYear) => {
  if (newYear && !expandedYears.value.has(newYear)) {
    expandedYears.value.add(newYear)
  }
}, { immediate: true })
</script>