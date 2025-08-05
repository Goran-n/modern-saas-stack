<template>
  <div class="h-screen bg-neutral-50 grid grid-cols-[320px_1fr]">
    <!-- Sidebar -->
    <div class="border-r border-neutral-200 bg-white overflow-y-auto">
      <FileManagerSidebar
        v-if="fileDataUnwrapped"
        :file-data="fileDataUnwrapped"
        :processing-files="processingFiles"
        :failed-files="failedFiles"
        :selected-year="selectedYear"
        :selected-supplier="selectedSupplier"
        :selected-status="selectedStatus"
        :loading="!!isLoading"
        @year-selected="handleYearSelected"
        @supplier-selected="handleSupplierSelected"
        @status-selected="handleStatusSelected"
      />
      <FileManagerSidebar
        v-else
        :processing-files="processingFiles"
        :failed-files="failedFiles"
        :selected-year="selectedYear"
        :selected-supplier="selectedSupplier"
        :selected-status="selectedStatus"
        :loading="!!isLoading"
        @year-selected="handleYearSelected"
        @supplier-selected="handleSupplierSelected"
        @status-selected="handleStatusSelected"
      />
    </div>

    <!-- Main Content -->
    <div class="overflow-y-auto col-span-1">
      <div class="p-4 md:p-6 max-w-none w-full">
        <!-- Header -->
        <div class="mb-6">
          <div class="flex items-center justify-between">
            <div>
              <h1 class="text-2xl font-semibold">Files</h1>
              <nav class="mt-1 flex" aria-label="Breadcrumb">
                <ol class="flex items-center space-x-2">
                  <li v-for="(link, index) in breadcrumbLinks" :key="index">
                    <div class="flex items-center">
                      <a :href="link.to" class="text-sm font-medium text-neutral-500 hover:text-neutral-700">
                        {{ link.label }}
                      </a>
                      <Icon 
                        v-if="index < breadcrumbLinks.length - 1"
                        name="heroicons:chevron-right" 
                        class="ml-2 h-4 w-4 text-neutral-400" 
                      />
                    </div>
                  </li>
                </ol>
              </nav>
            </div>
              
            <div class="flex items-center gap-3">
              <!-- View Toggle -->
              <div class="flex rounded-md shadow-sm" role="group">
                <FigButton
                  :variant="viewMode === 'grid' ? 'solid' : 'outline'"
                  size="sm"
                  class="rounded-r-none"
                  @click="viewMode = 'grid'"
                >
                  <Icon name="heroicons:squares-2x2" class="h-4 w-4" />
                </FigButton>
                <FigButton
                  :variant="viewMode === 'list' ? 'solid' : 'outline'"
                  size="sm"
                  class="rounded-l-none -ml-px"
                  @click="viewMode = 'list'"
                >
                  <Icon name="heroicons:list-bullet" class="h-4 w-4" />
                </FigButton>
              </div>
            </div>
          </div>
        </div>

        <!-- Loading State -->
        <div v-if="isLoading" class="space-y-4">
          <FigSkeleton class="h-32 w-full" v-for="i in 6" :key="i" />
        </div>

        <!-- Error State -->
        <FigEmptyState
          v-else-if="error"
          type="error"
          :description="error?.message || 'There was an error loading your files'"
        />

        <!-- Supplier Folders Display -->
        <div v-else-if="currentSuppliers.length > 0">
          <!-- File Count -->
          <div class="mb-4">
            <p class="text-sm text-muted">
              {{ currentSuppliers.length }} {{ currentSuppliers.length === 1 ? 'supplier' : 'suppliers' }}
              for {{ selectedYear }}
            </p>
          </div>

          <!-- Supplier Grid -->
          <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            <div
              v-for="supplier in currentSuppliers"
              :key="supplier.id"
              @click="handleSupplierSelected(supplier.name)"
              class="cursor-pointer transition-all duration-200 bg-white rounded-lg border border-neutral-200 hover:border-primary-300 p-4"
            >
              <div class="aspect-square flex flex-col items-center justify-center">
                <!-- Supplier Logo -->
                <div class="w-12 h-12 mb-3 flex items-center justify-center">
                  <SupplierLogo
                    :name="supplier.name"
                    :logo-url="supplier.logoUrl"
                    size="lg"
                    class="w-12 h-12"
                  />
                </div>

                <!-- Supplier Name -->
                <h3 
                  class="text-sm font-medium text-center line-clamp-2 hover:text-primary transition-colors"
                  :title="supplier.name"
                >
                  {{ supplier.name }}
                </h3>

                <!-- File Count -->
                <div class="mt-2 text-center">
                  <p class="text-xs text-muted">
                    {{ supplier.fileCount }} {{ supplier.fileCount === 1 ? 'file' : 'files' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Empty State -->
        <FigEmptyState
          v-else-if="!currentFiles.length"
          type="empty"
          image="/empty-coffee-receipts.webp"
          :description="currentView === 'status' 
            ? `No ${selectedStatus} files at the moment` 
            : 'Select a year and supplier to view files'"
        />

        <!-- Files Display -->
        <div v-else>
          <!-- File Count -->
          <div class="mb-4">
            <p class="text-sm text-muted">
              {{ currentFiles.length }} {{ currentFiles.length === 1 ? 'file' : 'files' }}
              {{ currentView === 'supplier' ? `from ${selectedSupplier}` : '' }}
              {{ currentView === 'status' ? selectedStatus : '' }}
            </p>
          </div>

          <!-- File Grid -->
          <div 
            v-if="viewMode === 'grid'"
            class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4"
          >
            <FileCard
              v-for="file in currentFiles"
              :key="file.id"
              :file="file"
              @click="handleFileSelected(file)"
            />
          </div>

          <!-- File List -->
          <div 
            v-else
            class="space-y-2"
          >
            <FileRow
              v-for="file in currentFiles"
              :key="file.id"
              :file="file"
              @click="handleFileSelected(file)"
            />
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- File Preview Modal (outside grid for proper overlay) -->
  <Teleport to="body">
    <FilePreview
      v-if="selectedFile"
      :file="selectedFile"
      @close="handleFileModalClose"
    />
  </Teleport>
</template>

<script setup lang="ts">
import { useQuery } from '@tanstack/vue-query'
import type { File, FileItem } from '@figgy/types';
import { FigButton, FigSkeleton, FigEmptyState } from '@figgy/ui';
import SupplierLogo from '~/components/atoms/SupplierLogo.vue';
import FileManagerSidebar from '~/components/FileManagerSidebar.vue';
import FileCard from '~/components/molecules/FileCard.vue';
import FileRow from '~/components/molecules/FileRow.vue';
import FilePreview from '~/components/organisms/FilePreview.vue';
import type { FileManagerState } from '~/composables/useHashNavigation';

// Page meta
definePageMeta({
  middleware: ['auth', 'onboarding']
})

// Local interfaces
interface SupplierWithLogo {
  name: string;
  supplierId: string | null;
  logoUrl: string | null;
  fileCount: number;
  files?: any[];
}

interface FileDataSerializedWithLogo {
  byYear: Record<string, {
    year: string;
    totalFiles: number;
    suppliers: Record<string, SupplierWithLogo>;
  }>;
  totalFiles: number;
}

// Composables
const api = useApi()
const tenantStore = useTenantStore()
const { getCurrentState, updateHash, navigateToState, onHashChange } = useHashNavigation()

// localStorage keys (only for view mode now)
const STORAGE_KEYS = {
  viewMode: 'files_view_mode'
}

// Helper to get current year
const getCurrentYear = () => new Date().getFullYear().toString()

// Reactive state
const selectedYear = ref<string | null>(null)
const selectedSupplier = ref<string | null>(null)
const selectedStatus = ref<'processing' | 'failed' | null>(null)
const currentView = ref<'default' | 'supplier' | 'status'>('default')
const viewMode = ref<'grid' | 'list'>('grid')
const selectedFile = ref<FileItem | null>(null)

// Computed
const selectedTenantId = computed(() => tenantStore.selectedTenantId)
const fileDataUnwrapped = computed(() => fileData.value)

// Data fetching
const { data: fileData, isLoading, error } = useQuery<FileDataSerializedWithLogo>({
  queryKey: ['files-manager', selectedTenantId],
  queryFn: async () => {
    const input = { json: {} }
    const response = await api.get<{ result: { data: { json: any } } }>(`/trpc/files.getGroupedByYear?input=${encodeURIComponent(JSON.stringify(input))}`)
    const data = response.result.data.json
    
    // Transform the data to ensure suppliers have names
    const transformed: FileDataSerializedWithLogo = {
      byYear: {},
      totalFiles: data.totalFiles
    }
    
    for (const [year, yearData] of Object.entries(data.byYear as Record<string, any>)) {
      transformed.byYear[year] = {
        year: yearData.year,
        totalFiles: yearData.totalFiles,
        suppliers: {}
      }
      
      for (const [supplierName, supplierData] of Object.entries(yearData.suppliers as Record<string, any>)) {
        transformed.byYear[year].suppliers[supplierName] = {
          name: supplierName,
          supplierId: supplierData.supplierId,
          logoUrl: supplierData.logoUrl,
          fileCount: supplierData.fileCount,
          files: supplierData.files?.map((f: any) => ({
            ...f,
            createdAt: typeof f.createdAt === 'string' ? f.createdAt : new Date(f.createdAt).toISOString(),
            processingStatus: f.status || f.processingStatus
          })) || []
        }
      }
    }
    
    return transformed
  },
  enabled: () => !!selectedTenantId.value,
})

const { data: statusFiles } = useQuery({
  queryKey: ['files-status', selectedTenantId],
  queryFn: async () => {
    const input = { json: {} }
    const response = await api.get<{ result: { data: { json: { processing: File[], failed: File[] } } } }>(`/trpc/files.getProcessingStatus?input=${encodeURIComponent(JSON.stringify(input))}`)
    return response.result.data.json
  },
  enabled: () => !!selectedTenantId.value,
})

// Helper function to convert File to FileItem
const fileToFileItem = (file: File): FileItem => ({
  ...file,
  createdAt: typeof file.createdAt === 'string' ? file.createdAt : file.createdAt.toISOString(),
  processingStatus: file.status,
});

// Computed data
const processingFiles = computed(() => (statusFiles.value?.processing || []).map(fileToFileItem))
const failedFiles = computed(() => (statusFiles.value?.failed || []).map(fileToFileItem))

const currentSuppliers = computed(() => {
  if (currentView.value === 'status' || !fileDataUnwrapped.value || !selectedYear.value || selectedSupplier.value) return []

  const yearData = fileDataUnwrapped.value.byYear[selectedYear.value]
  if (!yearData) return []

  return Object.entries(yearData.suppliers).map(([name, supplier]) => ({
    id: supplier.supplierId || name,
    name: name,
    supplierId: supplier.supplierId,
    logoUrl: supplier.logoUrl,
    fileCount: supplier.fileCount,
    type: 'supplier'
  }))
})

// No need to fetch suppliers separately - logo data comes from file manager

const currentFiles = computed(() => {
  if (currentView.value === 'status') {
    return selectedStatus.value === 'processing' ? processingFiles.value : failedFiles.value
  }

  if (!fileDataUnwrapped.value || !selectedYear.value) return []

  const yearData = fileDataUnwrapped.value.byYear[selectedYear.value]
  if (!yearData) return []

  if (selectedSupplier.value && yearData.suppliers?.[selectedSupplier.value]) {
    const files = yearData.suppliers[selectedSupplier.value]?.files || [];
    return files.map((f: any) => typeof f.createdAt === 'string' ? f : fileToFileItem(f));
  }

  // If year is selected but no supplier, return empty (show suppliers instead)
  return []
})

const breadcrumbLinks = computed(() => {
  const links = [{ label: 'Files', to: '/files#/' }]
  
  if (currentView.value === 'status') {
    links.push({ 
      label: selectedStatus.value === 'processing' ? 'Processing' : 'Failed',
      to: `/files#/status/${selectedStatus.value}` 
    })
  } else if (selectedYear.value) {
    links.push({ 
      label: selectedYear.value, 
      to: `/files#/year/${selectedYear.value}` 
    })
    
    if (selectedSupplier.value) {
      links.push({ 
        label: selectedSupplier.value, 
        to: `/files#/year/${selectedYear.value}/supplier/${encodeURIComponent(selectedSupplier.value)}` 
      })
    }
  }
  
  return links
})

// Event handlers
const handleYearSelected = (year: string) => {
  selectedYear.value = year
  selectedSupplier.value = null
  selectedStatus.value = null
  currentView.value = 'default'
  
  // Update URL hash
  navigateToState({ view: 'default', year })
}

const handleSupplierSelected = (supplier: string) => {
  selectedSupplier.value = supplier
  selectedStatus.value = null
  currentView.value = 'supplier'
  
  // Update URL hash
  if (selectedYear.value) {
    navigateToState({ view: 'supplier', year: selectedYear.value, supplier })
  }
}

const handleStatusSelected = (status: 'processing' | 'failed') => {
  selectedStatus.value = status
  selectedYear.value = null
  selectedSupplier.value = null
  currentView.value = 'status'
  
  // Update URL hash
  navigateToState({ view: 'status', status })
}

const handleFileSelected = (file: FileItem | null) => {
  if (file) {
    selectedFile.value = file
    
    // Update URL to include file ID
    const currentState = {
      view: currentView.value,
      year: selectedYear.value || undefined,
      supplier: selectedSupplier.value || undefined,
      status: selectedStatus.value || undefined,
      fileId: file.id
    } as FileManagerState
    
    navigateToState(currentState)
  }
}

const handleFileModalClose = () => {
  selectedFile.value = null
  
  // Update URL to remove file ID
  const currentState = {
    view: currentView.value,
    year: selectedYear.value || undefined,
    supplier: selectedSupplier.value || undefined,
    status: selectedStatus.value || undefined
  } as FileManagerState
  
  navigateToState(currentState)
}

// Helper function to find file by ID across all data and determine correct context
const findFileById = (fileId: string): { file: FileItem; suggestedState?: Partial<FileManagerState> } | null => {
  // Search in current files first (supplier view or status view)
  const file = currentFiles.value.find(f => f.id === fileId)
  if (file) return { file }
  
  // Search in processing files
  const processingFile = processingFiles.value.find(f => f.id === fileId)
  if (processingFile) {
    return { 
      file: processingFile, 
      suggestedState: { view: 'status', status: 'processing' }
    }
  }
  
  // Search in failed files
  const failedFile = failedFiles.value.find(f => f.id === fileId)
  if (failedFile) {
    return { 
      file: failedFile, 
      suggestedState: { view: 'status', status: 'failed' }
    }
  }
  
  // Search across all files in all years/suppliers if data is loaded
  if (fileDataUnwrapped.value) {
    for (const [year, yearData] of Object.entries(fileDataUnwrapped.value.byYear)) {
      for (const [supplierName, supplierData] of Object.entries(yearData.suppliers)) {
        const supplierFile = supplierData.files?.find((f: any) => f.id === fileId)
        if (supplierFile) {
          return {
            file: typeof supplierFile.createdAt === 'string' ? supplierFile : fileToFileItem(supplierFile),
            suggestedState: { view: 'supplier', year, supplier: supplierName }
          }
        }
      }
    }
  }
  
  return null
}

// Watch viewMode changes and save to localStorage
watch(viewMode, (newMode) => {
  localStorage.setItem(STORAGE_KEYS.viewMode, newMode)
})

// Apply state from URL hash
const applyStateFromHash = (state: FileManagerState) => {
  selectedYear.value = state.year || null
  selectedSupplier.value = state.supplier || null
  selectedStatus.value = state.status || null
  currentView.value = state.view
  
  // Handle file ID - find and select the file if provided
  if (state.fileId) {
    // We'll set this after data loads in the watcher
    nextTick(() => {
      const result = findFileById(state.fileId!)
      if (result) {
        selectedFile.value = result.file
        
        // If we found the file but in a different context, suggest state correction
        if (result.suggestedState) {
          const correctedState = { ...state, ...result.suggestedState }
          // Only update URL if the context changed significantly
          if (JSON.stringify(state) !== JSON.stringify(correctedState)) {
            updateHash(correctedState)
          }
        }
      }
    })
  } else {
    selectedFile.value = null
  }
}

// Validate and fix invalid state
const validateAndFixState = (state: FileManagerState, forceValidation = false): FileManagerState => {
  // Don't validate if data isn't loaded yet, unless forced
  if (!forceValidation && !fileDataUnwrapped.value && !statusFiles.value) {
    return state
  }
  
  // Validate status view
  if (state.view === 'status' && state.status && statusFiles.value) {
    const hasFiles = state.status === 'processing' 
      ? (statusFiles.value?.processing?.length || 0) > 0
      : (statusFiles.value?.failed?.length || 0) > 0
    
    if (hasFiles) return state
    // If no files for this status, fallback to default but don't auto-select year
    return { view: 'default' as const }
  }
  
  // Validate year/supplier view
  if (state.view !== 'status' && state.year && fileDataUnwrapped.value?.byYear) {
    const yearData = fileDataUnwrapped.value.byYear[state.year]
    
    // Year exists
    if (yearData) {
      if (state.view === 'supplier' && state.supplier) {
        // Check if supplier exists in this year
        if (yearData.suppliers[state.supplier]) {
          return state
        }
        // Supplier doesn't exist, fallback to year view but keep the year
        return { view: 'default' as const, year: state.year }
      }
      // Year exists and we're in default view
      return state
    }
    
    // Year doesn't exist, try to fallback to a valid year but keep the original intent
    const years = Object.keys(fileDataUnwrapped.value.byYear).sort().reverse()
    if (years.length > 0) {
      const fallbackYear = years[0]
      if (fallbackYear && state.view === 'supplier' && state.supplier) {
        // Check if supplier exists in fallback year
        const fallbackYearData = fileDataUnwrapped.value.byYear[fallbackYear]
        if (fallbackYearData?.suppliers[state.supplier]) {
          return { view: 'supplier' as const, year: fallbackYear, supplier: state.supplier }
        }
      }
      // Fallback to year view with most recent year
      if (fallbackYear) {
        return { view: 'default' as const, year: fallbackYear }
      }
    }
  }
  
  // Only auto-select current year if we're forcing validation (initial load)
  if (forceValidation && fileDataUnwrapped.value?.byYear) {
    const currentYear = getCurrentYear()
    const years = Object.keys(fileDataUnwrapped.value.byYear).sort().reverse()
    
    if (fileDataUnwrapped.value.byYear[currentYear]) {
      return { view: 'default' as const, year: currentYear }
    } else if (years.length > 0) {
      return { view: 'default' as const, year: years[0] }
    }
  }
  
  return state
}

// Initialize from URL hash and set up navigation
onMounted(() => {
  // Restore view mode from localStorage
  const savedViewMode = localStorage.getItem(STORAGE_KEYS.viewMode) as 'grid' | 'list' | null
  if (savedViewMode) {
    viewMode.value = savedViewMode
  }
  
  // Set up hash change listener for browser navigation
  const cleanupHashListener = onHashChange((state) => {
    const validatedState = validateAndFixState(state)
    applyStateFromHash(validatedState)
    
    // Update URL if state was corrected
    if (JSON.stringify(state) !== JSON.stringify(validatedState)) {
      updateHash(validatedState)
    }
  })
  
  // Apply initial state from hash immediately (before data loads)
  const initialHashState = getCurrentState()
  if (initialHashState.view !== 'default' || initialHashState.year || initialHashState.supplier || initialHashState.status) {
    // Apply the state from URL immediately
    applyStateFromHash(initialHashState)
  }
  
  // Wait for data to load, then validate and potentially correct the state
  let unwatch: (() => void) | null = null
  unwatch = watch([fileData, statusFiles], ([data, status]) => {
    if (!data && !status) return
    
    // Get current state from URL hash
    const hashState = getCurrentState()
    const validatedState = validateAndFixState(hashState, true) // Force validation now that data is loaded
    
    // Apply the validated state
    applyStateFromHash(validatedState)
    
    // Only update URL if the state was actually corrected (not just auto-selected)
    const wasStateInvalid = (
      (hashState.view === 'status' && hashState.status && 
       ((hashState.status === 'processing' && (!status?.processing?.length)) ||
        (hashState.status === 'failed' && (!status?.failed?.length)))) ||
      (hashState.view !== 'status' && hashState.year && data?.byYear && 
       (!data.byYear[hashState.year] || 
        (hashState.view === 'supplier' && hashState.supplier && 
         !data.byYear[hashState.year]?.suppliers[hashState.supplier])))
    )
    
    if (wasStateInvalid || (!window.location.hash && validatedState.view !== 'default')) {
      updateHash(validatedState)
    }
    
    // Unwatch after initialization
    if (unwatch) {
      unwatch()
    }
  }, { immediate: true })
  
  // Cleanup on unmount
  onUnmounted(() => {
    cleanupHashListener()
  })
})

// SEO
useSeoMeta({
  title: 'Files | Figgy',
  description: 'Manage and view your uploaded files organised by year and supplier',
})
</script>